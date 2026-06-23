// Option A — turn domains into verified emails via Hunter.io.
// Reads out/companies_with_domain.csv, runs Hunter Domain Search per domain,
// keeps the best contacts (HR / management / generic dept inbox), verifies each,
// and writes out/emails.csv with only deliverable (or accept-all) addresses.
//
//   node scripts/leadgen/enrich.mjs
//
// Free tier is small (≈25 searches/mo). Set HUNTER_MAX_DOMAINS and upgrade when
// you're happy with the output. SMTP verification is done by Hunter (reliable);
// never verify by raw SMTP from your own server — it wrecks your IP reputation.

import { loadEnv, sleep, readCSV, writeCSV, isJunkDomain } from './lib.mjs';

const env = loadEnv();
const KEY = env.HUNTER_API_KEY;
if (!KEY) { console.error('Missing HUNTER_API_KEY in scripts/leadgen/.env'); process.exit(1); }
const MAX = Number(env.HUNTER_MAX_DOMAINS || 40);
const DO_VERIFY = env.HUNTER_VERIFY !== '0';

// We want the people who decide on staff perks / catering, plus a safe generic inbox.
const WANT_DEPARTMENTS = ['hr', 'management', 'executive', 'administrative'];
const WANT_GENERIC = /^(contact|rh|direction|administration|info|commercial|achat|hr)@/i;

async function hunt(domain) {
  const u = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=10&api_key=${KEY}`;
  const r = await fetch(u);
  if (!r.ok) { console.warn(`  ! domain-search ${r.status} for ${domain}`); return []; }
  const j = await r.json();
  return j.data?.emails || [];
}
async function verify(email) {
  const r = await fetch(`https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${KEY}`);
  if (!r.ok) return { status: 'unknown', score: null };
  const j = await r.json();
  return { status: j.data?.status || 'unknown', score: j.data?.score ?? null };
}

const companies = readCSV('companies_with_domain.csv');
const seen = new Set();
const domains = [];
for (const c of companies) {
  const d = (c.domain || '').toLowerCase();
  if (!d || isJunkDomain(d) || seen.has(d)) continue;
  seen.add(d); domains.push(c);
  if (domains.length >= MAX) break;
}
console.log(`Enriching ${domains.length} domains (cap ${MAX})…`);

const out = [];
for (const [i, c] of domains.entries()) {
  process.stdout.write(`\r[${i + 1}/${domains.length}] ${c.domain}            `);
  const emails = await hunt(c.domain);
  const picked = emails.filter((e) =>
    WANT_DEPARTMENTS.includes(e.department) || e.type === 'generic' || WANT_GENERIC.test(e.value)
  );
  const list = (picked.length ? picked : emails).slice(0, 4);
  for (const e of list) {
    let status = 'not_verified', score = e.confidence ?? null;
    if (DO_VERIFY) { const v = await verify(e.value); status = v.status; score = v.score ?? score; await sleep(400); }
    out.push({
      company: c.name, domain: c.domain, email: e.value,
      first_name: e.first_name || '', last_name: e.last_name || '',
      position: e.position || '', department: e.department || '', type: e.type || '',
      hunter_confidence: e.confidence ?? '', verify_status: status, verify_score: score ?? '',
      phone: c.phone || '', address: c.address || '',
    });
  }
  await sleep(400);
}

const cols = ['company', 'email', 'first_name', 'last_name', 'position', 'department',
  'verify_status', 'verify_score', 'hunter_confidence', 'domain', 'phone', 'address'];
writeCSV('emails.csv', out, cols);
const good = out.filter((e) => ['valid', 'accept_all', 'webmail'].includes(e.verify_status));
writeCSV('emails_deliverable.csv', good, cols);

console.log(`\n\nDone. ${out.length} candidate emails, ${good.length} deliverable.`);
console.log('  → out/emails.csv (all candidates + status)');
console.log('  → out/emails_deliverable.csv (send to these)');
