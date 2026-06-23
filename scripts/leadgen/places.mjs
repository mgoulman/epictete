// Option A — find industrial companies via Google Places API (New).
// Runs a grid of {sector} × {zone} text searches, paginates, dedupes by place id,
// and writes out/companies.csv (name, website, domain, phone, address).
//
//   node scripts/leadgen/places.mjs
//
// Cost: Places Text Search is billed per request but Google gives a large monthly
// free credit; a full run here is a few hundred requests. Keep your key restricted.

import { loadEnv, sleep, domainOf, isJunkDomain, writeCSV } from './lib.mjs';

const env = loadEnv();
const KEY = env.GOOGLE_PLACES_API_KEY;
if (!KEY) { console.error('Missing GOOGLE_PLACES_API_KEY in scripts/leadgen/.env'); process.exit(1); }

// Tune these to your catchment.
const ZONES = [
  'Bouskoura', 'Ouled Saleh', 'Had Soualem', 'Dar Bouazza',
  'Sidi Maârouf Casablanca', 'Lissasfa Casablanca', 'Aïn Sebaâ Casablanca',
  'zone industrielle Bouskoura', 'parc industriel Ouled Saleh', 'CFCIM Bouskoura',
];
const SECTORS = [
  'usine', 'société industrielle', 'entreprise industrielle', 'zone industrielle',
  'fabrication', 'agroalimentaire', 'plasturgie', 'métallurgie', 'textile usine',
  'logistique entrepôt', 'emballage', 'chimie industrielle', 'matériaux construction',
];

const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.websiteUri',
  'places.internationalPhoneNumber', 'places.nationalPhoneNumber',
  'places.formattedAddress', 'places.primaryType', 'places.types',
  'nextPageToken',
].join(',');

async function searchText(textQuery, pageToken) {
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({ textQuery, languageCode: 'fr', regionCode: 'MA', pageSize: 20, pageToken }),
  });
  if (!r.ok) { console.warn(`  ! ${r.status} for "${textQuery}"`, (await r.text()).slice(0, 120)); return {}; }
  return r.json();
}

const byId = new Map();
let queries = 0;

for (const sector of SECTORS) {
  for (const zone of ZONES) {
    const q = `${sector} ${zone}`;
    let token, page = 0;
    do {
      const data = await searchText(q, token);
      queries++;
      for (const p of data.places || []) {
        if (byId.has(p.id)) continue;
        const website = p.websiteUri || '';
        byId.set(p.id, {
          name: p.displayName?.text || '',
          website,
          domain: domainOf(website) || '',
          phone: p.internationalPhoneNumber || p.nationalPhoneNumber || '',
          address: p.formattedAddress || '',
          type: p.primaryType || (p.types || [])[0] || '',
          place_id: p.id,
          query: q,
        });
      }
      token = data.nextPageToken;
      page++;
      if (token) await sleep(2000); // New API: token needs a moment to activate
    } while (token && page < 3);
    process.stdout.write(`\r${queries} queries · ${byId.size} companies`);
  }
}

const all = [...byId.values()];
const withEmailable = all.filter((c) => c.domain && !isJunkDomain(c.domain));
const cols = ['name', 'domain', 'website', 'phone', 'address', 'type', 'place_id', 'query'];
writeCSV('companies.csv', all, cols);
writeCSV('companies_with_domain.csv', withEmailable, cols);

console.log(`\n\nDone. ${all.length} companies (${withEmailable.length} with a usable domain).`);
console.log('  → out/companies.csv (everything: names + phones, good for cold-calling)');
console.log('  → out/companies_with_domain.csv (feed this to enrich.mjs for emails)');
