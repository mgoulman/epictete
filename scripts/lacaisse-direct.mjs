// Call the LaCaisse dashboard API directly with the recipe captured via Playwright.
// Target the same date range as the user's screenshot: 10/04/2025 → 27/04/2026.
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('/Users/macbook/Desktop/epictelerestaurant/.env.local', 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const auth = await (await fetch('https://apiv2.lacaisse.ma/api/v1/auth', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ login: env.LACAISSE_LOGIN, password: env.LACAISSE_PASSWORD }),
})).json();
const bearer = auth.token;
const account = auth.id_account_caisse;
const CAISSE = 3349; // EPICTETE
console.log('account:', account, 'caisse:', CAISSE);

const headers = {
  'Authorization': `Bearer ${bearer}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'x-identifier-val': String(CAISSE),
  'x-identifier-account': String(account),
  'Origin': 'https://backoffice.lacaisse.ma',
  'Referer': 'https://backoffice.lacaisse.ma/',
};

const callJson = async (path, info) => {
  const r = await fetch(`https://apiv2.lacaisse.ma${path}`, {
    method: 'POST', headers, body: JSON.stringify({ info }),
  });
  if (!r.ok) { console.log(`  ${path} → ${r.status}`, await r.text().then(t => t.slice(0, 200))); return null; }
  return r.json();
};

// Dashboard screenshot range: 10/04/2025 → 27/04/2026 (DD/MM/YY)
const ranges = [
  { dateDebut: '10/04/25', dateFin: '27/04/26' },
  { dateDebut: '04/10/25', dateFin: '04/27/26' }, // try US format too
];

for (const range of ranges) {
  const info = { ...range, listcaisses: null };
  console.log('\n=== Range:', JSON.stringify(range), '===');

  const moy = await callJson('/api/v1/activitemoyenne/3349', info);
  if (moy?.data?.moyennes2) {
    const m = moy.data.moyennes2;
    console.log('moyennes2:', JSON.stringify(m, null, 2));
  }

  const act = await callJson('/api/v1/activite/3349', info);
  if (act?.data) {
    const d = act.data;
    console.log('CA réalisé (number_affaire):', d.moyennesnumber_affaire?.number_affaire);
    console.log('CA annulé:', d.moyennesca_annule?.ca_annule);
    console.log('CA du jour:', d.moyennesca_du_jour?.ca_du_jour);
    console.log('Bénéfice du jour:', d.moyennesbenefice_jour?.benefice_jour);
    console.log('resulatMoyenne7 (transactions?):', d.resulatMoyenne7);
  }

  // Daily breakdown uses dash-separated dates
  const journalierInfo = {
    dateDebut: range.dateDebut.replaceAll('/', '-'),
    dateFin: range.dateFin.replaceAll('/', '-'),
    listcaisses: '',
  };
  const j = await callJson('/api/v1/activitejournalier/3349', journalierInfo);
  if (j?.data?.graph) {
    const ventes = j.data.graph.ventes || [];
    const sum = ventes.reduce((a, b) => a + (Number(b) || 0), 0);
    console.log('Daily revenue array sum:', sum, 'over', ventes.length, 'days');
  }
}

console.log('\nTarget from dashboard: CA 1,323,885.74 MAD / 4,231 trans / 8,533 couverts');
