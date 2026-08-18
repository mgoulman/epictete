import { readFileSync } from 'fs';
for (const line of readFileSync('/Users/macbook/Desktop/epictelerestaurant/.env.local', 'utf8').split('\n')) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  const k = line.slice(0, i).trim();
  if (!process.env[k]) process.env[k] = line.slice(i + 1).trim();
}
const { authenticate, resolveCaisseId } = await import('../lib/lacaisse/dashboard.ts');
const auth = await authenticate(process.env.LACAISSE_LOGIN, process.env.LACAISSE_PASSWORD);
const caisseId = await resolveCaisseId(auth, { login: process.env.LACAISSE_LOGIN, password: process.env.LACAISSE_PASSWORD, caisseName: 'EPICTETE' });

const headers = {
  'Authorization': `Bearer ${auth.bearer}`,
  'Content-Type': 'application/json',
  'x-identifier-val': String(caisseId),
  'x-identifier-account': String(auth.accountCaisseId),
  'Origin': 'https://backoffice.lacaisse.ma',
  'Referer': 'https://backoffice.lacaisse.ma/',
};
const info = { dateDebut: '01/04/26', dateFin: '30/04/26', listcaisses: null };

const endpoints = [
  '/api/v1/activitecomparer/compareCategory/' + caisseId,
  '/api/v1/activitecomparer/compareProduit/' + caisseId + '/1',
  '/api/v1/activitepaiement/' + caisseId,
  '/api/v1/activitehoraire/' + caisseId + '/0',
  '/api/v1/activiteventeparsku/' + caisseId,
];

for (const ep of endpoints) {
  try {
    const r = await fetch(`https://apiv2.lacaisse.ma${ep}`, { method: 'POST', headers, body: JSON.stringify({ info }) });
    const j = await r.json();
    console.log(`\n=== ${ep} (${r.status}) ===`);
    const s = JSON.stringify(j, null, 2);
    console.log(s.length > 1500 ? s.slice(0, 1500) + '...' : s);
  } catch (e) {
    console.log(`\n=== ${ep} ERROR ===`);
    console.log(e.message);
  }
}
