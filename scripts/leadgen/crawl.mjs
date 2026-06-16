// Option B — extract emails straight from each company's own website.
// No API key. Reads out/companies_with_domain.csv, fetches the homepage plus a
// few common contact/legal pages, and pulls published email addresses (handling
// "nom [at] domaine [point] com" obfuscation and HTML entities).
//
//   node scripts/leadgen/crawl.mjs
//
// Emails published on a company's own /contact or /mentions-legales page are
// real by definition — this nicely complements Hunter (covers domains it misses).

import { loadEnv, sleep, readCSV, writeCSV, isJunkDomain } from './lib.mjs';

const env = loadEnv();
const MAX = Number(env.CRAWL_MAX || 200);
const CONCURRENCY = Number(env.CRAWL_CONCURRENCY || 6);
const UA = 'Mozilla/5.0 (compatible; EpicteteLeadBot/1.0; +contact restaurant)';
const PATHS = ['', '/contact', '/contact.html', '/contact-us', '/nous-contacter',
  '/contactez-nous', '/mentions-legales', '/mentions-legales.html', '/a-propos', '/about'];

const deobfuscate = (html) => html
  .replace(/&#0*64;|&commat;/gi, '@').replace(/&#0*46;/g, '.')
  .replace(/\s*\[\s*at\s*\]\s*|\s*\(\s*at\s*\)\s*|\s+at\s+/gi, '@')
  .replace(/\s*\[\s*dot\s*\]\s*|\s*\(\s*dot\s*\)\s*|\s+dot\s+|\s*\[\s*point\s*\]\s*/gi, '.');

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const BAD = /\.(png|jpe?g|gif|svg|webp|css|js|wixpress|sentry|example|domain)\b|^(your|email|name|user|info)@(example|domain|email)/i;

async function getEmails(domain) {
  const found = new Map(); // email -> source path
  for (const p of PATHS) {
    for (const scheme of ['https', 'http']) {
      const url = `${scheme}://${domain}${p}`;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: ctrl.signal });
        clearTimeout(t);
        if (!r.ok) break; // try next path (skip http if https answered)
        const html = deobfuscate(await r.text());
        for (const m of html.match(EMAIL_RE) || []) {
          const e = m.toLowerCase();
          if (BAD.test(e) || e.length > 60) continue;
          if (!found.has(e)) found.set(e, p || '/');
        }
        break; // https worked, don't also try http
      } catch { /* timeout / DNS / TLS — try next */ }
    }
  }
  return found;
}

const companies = readCSV('companies_with_domain.csv');
const seen = new Set();
const targets = [];
for (const c of companies) {
  const d = (c.domain || '').toLowerCase();
  if (!d || isJunkDomain(d) || seen.has(d)) continue;
  seen.add(d); targets.push(c);
  if (targets.length >= MAX) break;
}
console.log(`Crawling ${targets.length} sites (concurrency ${CONCURRENCY})…`);

const out = [];
let done = 0;
async function worker(queue) {
  for (const c of queue) {
    const emails = await getEmails(c.domain);
    for (const [email, src] of emails) {
      const root = c.domain.split('.').slice(-2).join('.');
      out.push({
        company: c.name, domain: c.domain, email,
        on_company_domain: email.endsWith('@' + c.domain) || email.endsWith('.' + root) ? 'yes' : 'no',
        source_path: src, phone: c.phone || '', address: c.address || '',
      });
    }
    done++;
    process.stdout.write(`\r[${done}/${targets.length}] ${c.domain}  (+${emails.size})            `);
    await sleep(150);
  }
}
// simple worker pool
const chunks = Array.from({ length: CONCURRENCY }, () => []);
targets.forEach((c, i) => chunks[i % CONCURRENCY].push(c));
await Promise.all(chunks.map(worker));

const cols = ['company', 'email', 'on_company_domain', 'source_path', 'domain', 'phone', 'address'];
writeCSV('emails_crawled.csv', out, cols);
const onDomain = out.filter((e) => e.on_company_domain === 'yes');
writeCSV('emails_crawled_ondomain.csv', onDomain, cols);

console.log(`\n\nDone. ${out.length} emails from ${targets.length} sites (${onDomain.length} on the company's own domain).`);
console.log('  → out/emails_crawled.csv (all published emails found)');
console.log('  → out/emails_crawled_ondomain.csv (only addresses on the company domain — highest confidence)');
