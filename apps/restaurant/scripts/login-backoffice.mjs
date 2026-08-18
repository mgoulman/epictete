// Log into backoffice.lacaisse.ma like a browser, then probe the dashboard endpoints
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('/Users/macbook/Desktop/epictelerestaurant/.env.local', 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const cookieJar = new Map();
const setCookies = (resp) => {
  const sc = resp.headers.getSetCookie?.() || (resp.headers.raw?.()?.['set-cookie'] || []);
  for (const c of sc) {
    const [kv] = c.split(';');
    const [k, v] = kv.split('=');
    cookieJar.set(k.trim(), v);
  }
};
const cookieHeader = () => [...cookieJar].map(([k, v]) => `${k}=${v}`).join('; ');

// Auth
const auth = await (await fetch('https://apiv2.lacaisse.ma/api/v1/auth', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': 'https://backoffice.lacaisse.ma', 'Referer': 'https://backoffice.lacaisse.ma/' },
  body: JSON.stringify({ login: env.LACAISSE_LOGIN, password: env.LACAISSE_PASSWORD }),
})).json();
console.log('id_account_caisse:', auth.id_account_caisse, '/ licence:', auth.licence);

const token = auth.licence;
const bearer = auth.token;
const acctCaisse = auth.id_account_caisse;

// Probe a wide set of legacy export PHPs — many are named differently
const phpNames = [
  'export_excel_ventejournalier','export_excel_journalier','export_excel_dailysales',
  'export_excel_ventecategorie','export_excel_categorie','export_excel_categorie_jour',
  'export_excel_venteproduit','export_excel_produit','export_excel_top_produits',
  'export_excel_ca','export_excel_chiffre_affaire','export_excel_tableau_de_bord',
  'export_excel_couvert','export_excel_couverts','export_excel_ticket','export_excel_tickets',
  'tableau_de_bord','dashboard','stats','statistique','sales_summary',
  'getsalesperday','sales_per_day','venteperjour','ca_per_day',
  'getCAJournalier','getStatsCaisse','statsCaisse','getStatsVente',
];

const start = '04/10/2025'; const end = '04/27/2026';
const baseParams = `caisse=${acctCaisse}&startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}&token_api=${token}&idcaisselist=${acctCaisse}`;

console.log('\n--- Probing api-legacy.lacaisse.ma ---');
for (const name of phpNames) {
  for (const ext of ['.php','']) {
    const url = `https://api-legacy.lacaisse.ma/${name}${ext}?${baseParams}`;
    try {
      const r = await fetch(url);
      if (r.status === 200) {
        const ct = r.headers.get('content-type') || '';
        const len = (await r.arrayBuffer()).byteLength;
        if (len > 100) console.log(`  ✓ 200 ${name}${ext} (${ct}, ${len} bytes)`);
      } else if (r.status !== 404) {
        console.log(`  ${r.status} ${name}${ext}`);
      }
    } catch {}
  }
}

console.log('\n--- Probing apiv2.lacaisse.ma POST/GET endpoints ---');
const v2Endpoints = [
  'api/v1/sales/dashboard','api/v1/dashboard/data','api/v1/dashboard/sales',
  'api/v1/ventes/journalier','api/v1/ventes/dashboard','api/v1/ventes/stats',
  'api/v1/stats/ventes','api/v1/stats/sales','api/v1/stats/dashboard',
  'api/v1/tableau-de-bord/data','api/v1/tableaudebord','api/v1/tableau_de_bord',
  'api/v1/caisse/stats','api/v1/caisse/dashboard',
  'api/v1/caisse/sales','api/v1/account/dashboard',
];
for (const ep of v2Endpoints) {
  for (const method of ['GET','POST']) {
    for (const auth_h of [{'Authorization': `Bearer ${bearer}`}, {}]) {
      const url = `https://apiv2.lacaisse.ma/${ep}`;
      const opts = {
        method,
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', ...auth_h },
        body: method === 'POST' ? JSON.stringify({ caisse: acctCaisse, startDate: start, endDate: end, token_api: token, idcaisselist: acctCaisse }) : undefined,
      };
      try {
        const r = await fetch(url, opts);
        if (r.status === 200) {
          const text = await r.text();
          if (text && !text.startsWith('<')) {
            console.log(`  ✓ ${method} ${ep} (auth=${Object.keys(auth_h).length})`);
            console.log(`    body[0..400]:`, text.slice(0, 400));
          }
        }
      } catch {}
    }
  }
}
