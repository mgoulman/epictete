// Look up the list of caisses associated with this LaCaisse account
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('/Users/macbook/Desktop/epictelerestaurant/.env.local', 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const authRes = await fetch('https://apiv2.lacaisse.ma/api/v1/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ login: env.LACAISSE_LOGIN, password: env.LACAISSE_PASSWORD }),
});
const auth = await authRes.json();
console.log('id_account_caisse:', auth.id_account_caisse);
console.log('show_store:', auth.show_store);
console.log('account_name:', auth.account_name);
console.log('uuid:', auth.uuid);
const token = auth.licence;
const bearer = auth.token;
console.log('has bearer token:', !!bearer);

// Try a few known LaCaisse v2 endpoints to enumerate caisses
const endpointsToTry = [
  '/api/v1/caisses',
  '/api/v1/caisse',
  '/api/v1/account/caisses',
  '/api/v1/stores',
  '/api/v1/store',
  '/api/v1/me',
  '/api/v1/profile',
  '/api/v1/account',
  '/api/v1/users/me',
  '/api/v1/etablissements',
  '/api/v1/etablissement',
  '/api/v1/locations',
  '/api/v1/enseignes',
];

for (const ep of endpointsToTry) {
  for (const auth_method of ['bearer', 'token_query']) {
    const url = new URL(`https://apiv2.lacaisse.ma${ep}`);
    const headers = { 'Accept': 'application/json' };
    if (auth_method === 'bearer') headers['Authorization'] = `Bearer ${bearer}`;
    else url.searchParams.set('token_api', token);
    const r = await fetch(url.toString(), { headers });
    if (r.ok) {
      const text = await r.text();
      const truncated = text.slice(0, 500);
      console.log(`\nGET ${ep} (${auth_method}): ${r.status}`);
      console.log('  body:', truncated);
    } else if (r.status !== 404) {
      console.log(`GET ${ep} (${auth_method}): ${r.status}`);
    }
  }
}

// Also probe legacy api endpoints for caisse list
const legacyEPs = [
  'list_caisse.php', 'caisse.php', 'caisses.php', 'list_caisses.php',
  'get_caisses.php', 'getcaisses.php', 'enseignes.php', 'list_etablissement.php',
];
for (const ep of legacyEPs) {
  const url = new URL(`https://api-legacy.lacaisse.ma/${ep}`);
  url.searchParams.set('token_api', token);
  const r = await fetch(url.toString());
  if (r.ok) {
    const text = await r.text();
    console.log(`\nGET legacy ${ep}: ${r.status}`);
    console.log('  body:', text.slice(0, 500));
  }
}
