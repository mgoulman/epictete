// Direct invocation of the sync logic (re-imports the same modules the route uses)
import { query } from '../lib/db.ts';
import {
  authenticate,
  getDailyRevenue,
  getRangeKpis,
  getDashboardConfig,
  resolveCaisseId,
} from '../lib/lacaisse/dashboard.ts';
import { readFileSync } from 'fs';

// Load env (bypass Next.js-style auto-loading)
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  const k = line.slice(0, i).trim();
  if (!process.env[k]) process.env[k] = line.slice(i + 1).trim();
}

const cfg = getDashboardConfig();
console.log('config:', { login: cfg.login, caisseName: cfg.caisseName });

const auth = await authenticate(cfg.login, cfg.password);
const caisseId = await resolveCaisseId(auth, cfg);
console.log('caisseId:', caisseId);

const range = { startDate: '2025-10-04', endDate: '2026-04-27' };
const [kpis, daily] = await Promise.all([
  getRangeKpis(auth, caisseId, range),
  getDailyRevenue(auth, caisseId, range),
]);
console.log('kpis:', kpis);
console.log('daily rows:', daily.length, 'sum:', daily.reduce((a, b) => a + b.revenue, 0).toFixed(2));

const totalRev = daily.reduce((s, d) => s + d.revenue, 0);
const split = (total, rev) => totalRev > 0 ? (rev / totalRev) * total : 0;

let upserted = 0;
for (const d of daily) {
  const dailyTrans = Math.round(split(kpis.transactions, d.revenue));
  const dailyCouv = Math.round(split(kpis.couverts, d.revenue));
  const avgTicket = dailyTrans > 0 ? d.revenue / dailyTrans : null;
  await query(
    `INSERT INTO lacaisse_daily (date, revenue, transactions, couverts, avg_ticket, fetched_at)
     VALUES ($1,$2,$3,$4,$5, now())
     ON CONFLICT (date) DO UPDATE SET revenue=EXCLUDED.revenue, transactions=EXCLUDED.transactions,
       couverts=EXCLUDED.couverts, avg_ticket=EXCLUDED.avg_ticket, fetched_at=now()`,
    [d.date, d.revenue, dailyTrans, dailyCouv, avgTicket],
  );
  upserted++;
}

await query(
  `INSERT INTO lacaisse_sync_runs (caisse_id, date_start, date_end, ca_realise, ca_annule, benefice,
    couverts, transactions, best_day, best_day_amount, days_synced)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
  [caisseId, range.startDate, range.endDate, kpis.caRealise, kpis.caAnnule, kpis.benefice,
   kpis.couverts, kpis.transactions, kpis.bestDay, kpis.bestDayAmount, upserted],
);

console.log('Upserted', upserted, 'days');

// Verify
const { rows: agg } = await query(
  `SELECT COUNT(*)::int days, ROUND(SUM(revenue)::numeric, 2)::text revenue,
          SUM(transactions)::int transactions, SUM(couverts)::int couverts
     FROM lacaisse_daily WHERE date BETWEEN $1 AND $2`,
  [range.startDate, range.endDate],
);
console.log('lacaisse_daily aggregate:', agg[0]);
process.exit(0);
