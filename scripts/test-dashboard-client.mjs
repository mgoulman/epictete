// Smoke test: import the new client (compile-free via dynamic .ts → just re-implement here)
// Actually call into compiled JS via `npx tsx` if possible; otherwise use the script directly.
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('/Users/macbook/Desktop/epictelerestaurant/.env.local', 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const { authenticate, resolveCaisseId, getRangeKpis, getDailyRevenue } = await import(
  // tsx will resolve TypeScript at runtime
  '../lib/lacaisse/dashboard.ts'
);

const auth = await authenticate(env.LACAISSE_LOGIN, env.LACAISSE_PASSWORD);
const caisseId = await resolveCaisseId(auth, { login: env.LACAISSE_LOGIN, password: env.LACAISSE_PASSWORD, caisseName: 'EPICTETE' });
console.log('Resolved caisse:', caisseId);

const range = { startDate: '2025-10-04', endDate: '2026-04-27' };
const kpis = await getRangeKpis(auth, caisseId, range);
console.log('Range KPIs:', kpis);
const daily = await getDailyRevenue(auth, caisseId, range);
console.log(`Daily rows: ${daily.length}, sum: ${daily.reduce((a, b) => a + b.revenue, 0).toFixed(2)}`);
console.log('First 3:', daily.slice(0, 3));
console.log('Last 3:', daily.slice(-3));
