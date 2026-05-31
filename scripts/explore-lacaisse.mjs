// Probe LaCaisse: pull every report type for a known range and inspect columns/totals.
import { readFileSync, writeFileSync } from 'fs';
import * as XLSX from 'xlsx';

const env = Object.fromEntries(
  readFileSync('/Users/macbook/Desktop/epictelerestaurant/.env.local', 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const LOGIN = env.LACAISSE_LOGIN;
const PASSWORD = env.LACAISSE_PASSWORD;
const CAISSE = env.LACAISSE_CAISSE_ID;

console.log('Authenticating as', LOGIN, '/ caisse', CAISSE);
const authRes = await fetch('https://apiv2.lacaisse.ma/api/v1/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ login: LOGIN, password: PASSWORD }),
});
const auth = await authRes.json();
console.log('Auth keys:', Object.keys(auth));
const token = auth.licence;
if (!token) { console.error('No licence in auth response'); console.error(auth); process.exit(1); }

// Range matching the LaCaisse dashboard screenshot
const start = '04/10/2025';
const end = '04/27/2026';

const endpoints = {
  detailed: 'export_excel.php',
  daily: 'export_excel_ventejournalier.php',
  category: 'export_excel_ventecategorie.php',
  product: 'export_excel_venteproduit.php',
  payment: 'export_excel_paiement.php',
};

const results = {};

for (const [name, ep] of Object.entries(endpoints)) {
  const url = new URL(`https://api-legacy.lacaisse.ma/${ep}`);
  url.searchParams.set('caisse', CAISSE);
  url.searchParams.set('startDate', start);
  url.searchParams.set('endDate', end);
  url.searchParams.set('token_api', token);
  url.searchParams.set('idcaisselist', CAISSE);
  console.log('\n=====', name, '=====');
  console.log(url.toString().replace(token, 'TOKEN'));
  const r = await fetch(url.toString());
  console.log('status', r.status, 'len', r.headers.get('content-length'));
  if (!r.ok) { console.log('skip'); continue; }
  const buf = await r.arrayBuffer();
  const path = `/tmp/lacaisse_${name}.xlsx`;
  writeFileSync(path, Buffer.from(buf));
  console.log('saved', path, buf.byteLength, 'bytes');
  try {
    const wb = XLSX.read(buf, { type: 'array' });
    for (const sn of wb.SheetNames) {
      const sheet = wb.Sheets[sn];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
      const cols = rows[0] ? Object.keys(rows[0]) : [];
      console.log(`  sheet "${sn}": ${rows.length} rows`);
      console.log(`  columns:`, cols);
      if (rows[0]) console.log(`  first row:`, rows[0]);
      results[name] = { sheet: sn, rows: rows.length, cols, sample: rows[0] };
      // For daily report, dump totals if available
      if (name === 'daily' && rows.length) {
        let totalRev = 0, totalCouv = 0, totalTrans = 0;
        for (const row of rows) {
          for (const k of Object.keys(row)) {
            const v = row[k];
            if (typeof v === 'number') {
              if (/^ca|chiffre|montant|total/i.test(k)) totalRev += v;
              if (/couvert/i.test(k)) totalCouv += v;
              if (/transaction|ticket/i.test(k)) totalTrans += v;
            }
          }
        }
        console.log(`  daily totals: rev=${totalRev} couv=${totalCouv} trans=${totalTrans}`);
      }
    }
  } catch (e) {
    console.log('  parse error:', e.message);
  }
}

console.log('\n=== Summary ===');
console.log(JSON.stringify(results, null, 2).slice(0, 2000));
