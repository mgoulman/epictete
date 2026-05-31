import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: string[] = [];
    const params: unknown[] = [];
    if (startDate) { params.push(startDate); where.push(`date >= $${params.length}`); }
    if (endDate)   { params.push(endDate);   where.push(`date <= $${params.length}`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const summarySql = `
      SELECT
        COALESCE(SUM(revenue), 0)::float       AS revenue,
        COALESCE(SUM(transactions), 0)::int    AS transactions,
        COALESCE(SUM(couverts), 0)::int        AS couverts,
        COUNT(*)::int                          AS days,
        MAX(fetched_at)                        AS last_synced
      FROM lacaisse_daily ${whereSql}
    `;
    const dailySql = `
      SELECT date::text AS date, revenue::float, transactions, couverts, avg_ticket::float
      FROM lacaisse_daily ${whereSql}
      ORDER BY date
    `;
    const lastRunSql = `
      SELECT id, caisse_id, date_start::text, date_end::text,
             ca_realise::float, ca_annule::float, benefice::float,
             couverts, transactions, best_day::text, best_day_amount::float,
             days_synced, created_at
      FROM lacaisse_sync_runs
      ORDER BY created_at DESC LIMIT 1
    `;

    // Top products + sales by category come from sales_items (line-level data
    // imported with import_source='lacaisse_dashboard'). Same date range filter.
    const lineWhere: string[] = [`import_source = 'lacaisse_dashboard'`];
    const lineParams: unknown[] = [];
    if (startDate) { lineParams.push(startDate); lineWhere.push(`sale_date >= $${lineParams.length}`); }
    if (endDate)   { lineParams.push(endDate);   lineWhere.push(`sale_date <= $${lineParams.length}`); }
    const lineWhereSql = `WHERE ${lineWhere.join(' AND ')}`;

    const topProductsSql = `
      SELECT product_name AS name,
             SUM(quantity)::int AS count,
             ROUND(SUM(selling_price)::numeric, 2)::float AS revenue
        FROM sales_items ${lineWhereSql}
       GROUP BY product_name
       ORDER BY revenue DESC NULLS LAST
       LIMIT 10
    `;
    const categoryStatsSql = `
      SELECT COALESCE(NULLIF(category, ''), '(autre)') AS name,
             SUM(quantity)::int AS count,
             ROUND(SUM(selling_price)::numeric, 2)::float AS revenue
        FROM sales_items ${lineWhereSql}
       GROUP BY 1
       ORDER BY revenue DESC NULLS LAST
    `;

    // Locally computed bénéfice: SUM(qty * effective_cost) joined via sales_cost_map.
    // effective_cost = COALESCE(manual_cost, recipes.cost_price, 0)
    // Coverage = revenue of mapped lines / total revenue (so the user sees how
    // trustworthy the number is before all dishes are mapped).
    const profitSql = `
      WITH lines AS (
        SELECT
          TRIM(BOTH ' -' FROM si.product_name) AS clean_name,
          si.quantity::float AS qty,
          si.selling_price::float AS line_total
        FROM sales_items si ${lineWhereSql}
      )
      SELECT
        COALESCE(SUM(line_total), 0)::float AS revenue,
        COALESCE(SUM(line_total) FILTER (WHERE m.product_name IS NOT NULL), 0)::float AS mapped_revenue,
        COALESCE(SUM(qty * COALESCE(m.manual_cost, r.cost_price, 0)), 0)::float AS total_cost,
        COUNT(DISTINCT clean_name) AS distinct_dishes,
        COUNT(DISTINCT clean_name) FILTER (WHERE m.product_name IS NOT NULL) AS mapped_dishes
      FROM lines
      LEFT JOIN sales_cost_map m ON m.product_name = clean_name
      LEFT JOIN recipes r ON r.id = m.recipe_id
    `;

    const [{ rows: s }, { rows: d }, { rows: lr }, { rows: tp }, { rows: cs }, { rows: pf }] = await Promise.all([
      query<{ revenue: number; transactions: number; couverts: number; days: number; last_synced: string | null }>(summarySql, params),
      query<{ date: string; revenue: number; transactions: number; couverts: number; avg_ticket: number | null }>(dailySql, params),
      query(lastRunSql),
      query<{ name: string; count: number; revenue: number }>(topProductsSql, lineParams),
      query<{ name: string; count: number; revenue: number }>(categoryStatsSql, lineParams),
      query<{ revenue: number; mapped_revenue: number; total_cost: number; distinct_dishes: number; mapped_dishes: number }>(profitSql, lineParams),
    ]);

    const summary = s[0] || { revenue: 0, transactions: 0, couverts: 0, days: 0, last_synced: null };
    const avgTicket = summary.transactions > 0 ? summary.revenue / summary.transactions : 0;
    const profit = pf[0] || { revenue: 0, mapped_revenue: 0, total_cost: 0, distinct_dishes: 0, mapped_dishes: 0 };
    const benefice = profit.mapped_revenue - profit.total_cost;
    const coverage = profit.revenue > 0 ? profit.mapped_revenue / profit.revenue : 0;
    const margin = profit.mapped_revenue > 0 ? benefice / profit.mapped_revenue : 0;

    return NextResponse.json({
      summary: { ...summary, avgTicket },
      daily: d,
      lastSyncRun: lr[0] || null,
      topProducts: tp,
      categoryStats: cs,
      profit: {
        benefice,
        totalCost: profit.total_cost,
        mappedRevenue: profit.mapped_revenue,
        coverage,                // 0..1 fraction of revenue with cost data
        marginOnMapped: margin,  // benefice / mapped_revenue
        distinctDishes: profit.distinct_dishes,
        mappedDishes: profit.mapped_dishes,
      },
    });
  } catch (err) {
    console.error('dashboard-stats error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
