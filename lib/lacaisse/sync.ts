import { query } from '@/lib/db';
import {
  authenticate,
  fetchLineItems,
  getDailyRevenue,
  getRangeKpis,
  getDashboardConfig,
  resolveCaisseId,
  type RangeKpis,
} from './dashboard';

export interface SyncResult {
  caisseId: number;
  range: { startDate: string; endDate: string };
  kpis: RangeKpis;
  daysSynced: number;
  linesFetched: number;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

// Pull KPIs + daily revenue + line items from LaCaisse and upsert them.
// Shared by the manual Import button (/api/finance/dashboard-sync) and the
// daily cron (/api/cron/lacaisse-sync) so both behave identically.
export async function runLacaisseSync(opts?: { startDate?: string; endDate?: string }): Promise<SyncResult> {
  const today = new Date();
  const endDate = opts?.endDate || isoDay(today);
  const startDate = opts?.startDate || isoDay(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));

  const cfg = getDashboardConfig();
  if (!cfg.login || !cfg.password) {
    throw new Error('LACAISSE_LOGIN / LACAISSE_PASSWORD not configured');
  }
  const auth = await authenticate(cfg.login, cfg.password);
  const caisseId = await resolveCaisseId(auth, cfg);
  const range = { startDate, endDate };

  const [kpis, daily] = await Promise.all([
    getRangeKpis(auth, caisseId, range),
    getDailyRevenue(auth, caisseId, range),
  ]);

  // Distribute couverts/transactions per day proportionally to revenue.
  const totalRevenue = daily.reduce((s, d) => s + d.revenue, 0);
  const splitProp = (total: number, dayRev: number) =>
    totalRevenue > 0 ? (dayRev / totalRevenue) * total : 0;

  let daysSynced = 0;
  for (const d of daily) {
    const dailyCouverts = Math.round(splitProp(kpis.couverts, d.revenue));
    const dailyTrans = Math.round(splitProp(kpis.transactions, d.revenue));
    const avgTicket = dailyTrans > 0 ? d.revenue / dailyTrans : null;
    await query(
      `INSERT INTO lacaisse_daily (date, revenue, transactions, couverts, avg_ticket, fetched_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (date) DO UPDATE SET
         revenue = EXCLUDED.revenue, transactions = EXCLUDED.transactions,
         couverts = EXCLUDED.couverts, avg_ticket = EXCLUDED.avg_ticket, fetched_at = now()`,
      [d.date, d.revenue, dailyTrans, dailyCouverts, avgTicket],
    );
    daysSynced++;
  }

  await query(
    `INSERT INTO lacaisse_sync_runs
      (caisse_id, date_start, date_end, ca_realise, ca_annule, benefice,
       couverts, transactions, best_day, best_day_amount, days_synced)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [caisseId, startDate, endDate, kpis.caRealise, kpis.caAnnule, kpis.benefice,
     kpis.couverts, kpis.transactions, kpis.bestDay, kpis.bestDayAmount, daysSynced],
  );

  // Line items for the Liste Ventes tab. Non-fatal: KPIs are already saved.
  let linesFetched = 0;
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
      linesFetched += slice.length;
    }
  } catch (err) {
    console.error('runLacaisseSync line items error:', err);
  }

  return { caisseId, range, kpis, daysSynced, linesFetched };
}
