import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  authenticate,
  fetchLineItems,
  getDailyRevenue,
  getRangeKpis,
  getDashboardConfig,
  resolveCaisseId,
} from '@/lib/lacaisse/dashboard';
import { enforce } from '@/lib/auth/supabase-server';

export async function POST(request: NextRequest) {
    const denied = await enforce('finance.write'); if (denied) return denied;
  try {
    const body = await request.json().catch(() => ({}));

    const today = new Date();
    const isoDay = (d: Date) => d.toISOString().slice(0, 10);

    const endDate: string = body.endDate || isoDay(today);
    const startDate: string =
      body.startDate ||
      isoDay(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));

    const cfg = getDashboardConfig();
    if (!cfg.login || !cfg.password) {
      return NextResponse.json(
        { error: 'LACAISSE_LOGIN / LACAISSE_PASSWORD not configured' },
        { status: 500 },
      );
    }

    const auth = await authenticate(cfg.login, cfg.password);
    const caisseId = await resolveCaisseId(auth, cfg);

    const range = { startDate, endDate };
    const [kpis, daily] = await Promise.all([
      getRangeKpis(auth, caisseId, range),
      getDailyRevenue(auth, caisseId, range),
    ]);

    // Distribute couverts/transactions per day proportionally to revenue.
    // The dashboard exposes totals only, but daily revenue is exact.
    const totalRevenue = daily.reduce((s, d) => s + d.revenue, 0);
    const splitProp = (total: number, dayRev: number) =>
      totalRevenue > 0 ? (dayRev / totalRevenue) * total : 0;

    let upserted = 0;
    for (const d of daily) {
      const dailyCouverts = Math.round(splitProp(kpis.couverts, d.revenue));
      const dailyTrans = Math.round(splitProp(kpis.transactions, d.revenue));
      const avgTicket = dailyTrans > 0 ? d.revenue / dailyTrans : null;
      await query(
        `INSERT INTO lacaisse_daily (date, revenue, transactions, couverts, avg_ticket, fetched_at)
         VALUES ($1, $2, $3, $4, $5, now())
         ON CONFLICT (date) DO UPDATE SET
           revenue = EXCLUDED.revenue,
           transactions = EXCLUDED.transactions,
           couverts = EXCLUDED.couverts,
           avg_ticket = EXCLUDED.avg_ticket,
           fetched_at = now()`,
        [d.date, d.revenue, dailyTrans, dailyCouverts, avgTicket],
      );
      upserted++;
    }

    await query(
      `INSERT INTO lacaisse_sync_runs
        (caisse_id, date_start, date_end, ca_realise, ca_annule, benefice,
         couverts, transactions, best_day, best_day_amount, days_synced)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        caisseId,
        startDate,
        endDate,
        kpis.caRealise,
        kpis.caAnnule,
        kpis.benefice,
        kpis.couverts,
        kpis.transactions,
        kpis.bestDay,
        kpis.bestDayAmount,
        upserted,
      ],
    );

    // ── Pull line items so the Liste Ventes tab stays up-to-date ────────────
    let linesInserted = 0;
    try {
      const items = await fetchLineItems(auth, caisseId, range);
      const cols = ['ticket_number', 'family', 'category', 'product_name', 'sub_product',
                    'quantity', 'catalog_price', 'selling_price', 'tax_rate', 'profit',
                    'dine_in', 'sale_date', 'sale_time', 'import_source', 'lacaisse_order_id'];
      const BATCH = 500;
      for (let i = 0; i < items.length; i += BATCH) {
        const slice = items.slice(i, i + BATCH);
        const placeholders: string[] = [];
        const values: unknown[] = [];
        let idx = 1;
        for (const it of slice) {
          placeholders.push(`(${cols.map(() => `$${idx++}`).join(', ')})`);
          values.push(
            it.ticket_number, it.family, it.category, it.product_name, it.sub_product,
            it.quantity, it.catalog_price, it.selling_price, it.tax_rate, it.profit,
            it.dine_in, it.sale_date, it.sale_time, 'lacaisse_dashboard', it.lacaisse_order_id,
          );
        }
        const sql = `INSERT INTO sales_items (${cols.join(', ')})
                     VALUES ${placeholders.join(', ')}
                     ON CONFLICT (ticket_number, product_name, sale_date, sale_time, quantity) DO NOTHING`;
        await query(sql, values);
        linesInserted += slice.length;
      }
    } catch (err) {
      // Non-fatal: KPIs are already saved. Log and continue.
      console.error('dashboard-sync line items error:', err);
    }

    return NextResponse.json({
      success: true,
      caisseId,
      range: { startDate, endDate },
      kpis,
      daysSynced: upserted,
      linesFetched: linesInserted,
    });
  } catch (err) {
    console.error('dashboard-sync error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
