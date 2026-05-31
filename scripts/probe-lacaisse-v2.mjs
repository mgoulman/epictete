// Try harder to find the dashboard endpoint, list caisses, and fetch with bearer auth
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('/Users/macbook/Desktop/epictelerestaurant/.env.local', 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const a = await fetch('https://apiv2.lacaisse.ma/api/v1/auth', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ login: env.LACAISSE_LOGIN, password: env.LACAISSE_PASSWORD }),
});
const auth = await a.json();
console.log('Full auth response:');
console.log(JSON.stringify(auth, null, 2));

const tokenApi = auth.licence;
const bearer = auth.token;
const acctCaisse = auth.id_account_caisse;

// Endpoints commonly used by LaCaisse front-ends. Try with both auth schemes.
const targets = [
  // dashboard / tableau de bord
  'api/v1/tableau-de-bord',
  'api/v1/dashboard',
  'api/v1/dashboard/sales',
  'api/v1/sales/dashboard',
  'api/v1/sales/summary',
  'api/v1/statistics',
  'api/v1/stats',
  // listing of caisses
  'api/v1/caisses',
  'api/v1/account/caisses',
  'api/v1/users/caisses',
  'api/v1/list/caisse',
  // some tries with id_account_caisse
  `api/v1/caisses/${acctCaisse}`,
  `api/v1/caisse/${acctCaisse}`,
];

const tryFetch = async (path, opts) => {
  const url = path.startsWith('http') ? path : `https://apiv2.lacaisse.ma/${path}`;
  try {
    const r = await fetch(url, opts);
    if (r.status === 200) {
      const text = await r.text();
      if (text.length > 0 && !text.startsWith('<!DOCTYPE')) {
        console.log(`\n✓ 200 ${url}`);
        console.log('  body[0..600]:', text.slice(0, 600));
      }
    } else if (r.status !== 404 && r.status !== 405) {
      console.log(`  ${r.status} ${url}`);
    }
    return r;
  } catch (e) {
    console.log(`  ERR ${url}: ${e.message}`);
  }
};

const headers = {
  bearer: { 'Authorization': `Bearer ${bearer}`, 'Accept': 'application/json' },
  legacy: { 'Accept': 'application/json' },
};

for (const t of targets) {
  await tryFetch(t, { headers: headers.bearer });
  await tryFetch(`${t}?token_api=${tokenApi}&caisse=${acctCaisse}`, { headers: headers.legacy });
}

// Also check what root paths exist on apiv2
console.log('\n--- Root probes ---');
for (const p of ['', 'api', 'api/v1', 'api/v2']) {
  const r = await fetch(`https://apiv2.lacaisse.ma/${p}`, { headers: headers.bearer });
  console.log(`${p || '/'}: ${r.status} ${r.headers.get('content-type')}`);
}

// Try caisse.ma front-end to see what JS bundles exist (might reveal API paths)
const front = await fetch('https://www.caisse.ma/');
console.log('\nfront page status:', front.status, 'len:', (await front.text()).length);
