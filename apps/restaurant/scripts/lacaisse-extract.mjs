// LaCaisse full extraction (READ-ONLY): catalogue, categories, sales (tickets + lines), till sessions.
// Saves everything locally as raw files so it can be reviewed before any merge into Odoo.
//
//   node scripts/lacaisse-extract.mjs            # extract into ~/Desktop/epictete-lacaisse-archive/extract_<today>
//   node scripts/lacaisse-extract.mjs --force    # re-download files that already exist
//
// Credentials are read from apps/restaurant/.env.local (LACAISSE_LOGIN / LACAISSE_PASSWORD) and never printed or saved.
// Deliberately NOT extracted: suppliers, stock, users/privileges (contains passwords).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const FORCE = process.argv.includes('--force');
const today = new Date().toISOString().slice(0, 10);
const OUT = join(homedir(), 'Desktop', 'epictete-lacaisse-archive', `extract_${today}`);
for (const d of ['catalogue', 'sales/tickets', 'sales/lines', 'sessions']) mkdirSync(join(OUT, d), { recursive: true });

const env = Object.fromEntries(
  readFileSync(join(here, '..', '.env.local'), 'utf8').split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const XLSX = await import(join(here, '..', 'node_modules', 'xlsx', 'xlsx.mjs'));

const API = 'https://apiv2.lacaisse.ma';
const LEGACY = 'https://api-legacy.lacaisse.ma';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const save = (rel, data) => { const p = join(OUT, rel); writeFileSync(p, typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data, null, 1)); return p; };
const have = (rel) => !FORCE && existsSync(join(OUT, rel));
const readJson = (rel) => JSON.parse(readFileSync(join(OUT, rel), 'utf8'));
const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16);

// ── auth ────────────────────────────────────────────────────────────────────
const auth = await (await fetch(`${API}/api/v1/auth`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ login: env.LACAISSE_LOGIN, password: env.LACAISSE_PASSWORD }),
})).json();
if (!auth.token || !auth.licence) throw new Error('LaCaisse auth failed');
const lc = await (await fetch(`${API}/api/v1/caisse/listCaisse`, {
  method: 'POST', headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: env.LACAISSE_LOGIN }),
})).json();
const caisse = (lc.data || []).find((c) => /epictete/i.test(`${c.nom_societe} ${c.email}`)) || (lc.data || [])[0];
const ID = caisse?.id_caisse || Number(env.LACAISSE_CAISSE_ID);
if (!ID) throw new Error('caisse id not found');
const H = {
  Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json', Accept: 'application/json',
  'x-identifier-val': String(ID), 'x-identifier-account': String(auth.id_account_caisse),
  Origin: 'https://backoffice.lacaisse.ma', Referer: 'https://backoffice.lacaisse.ma/',
};

async function call(method, path, body, tries = 3) {
  for (let t = 1; t <= tries; t++) {
    try {
      const r = await fetch(API + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
      if (r.status >= 500 && t < tries) { await sleep(1500 * t); continue; }
      if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}`);
      return await r.json();
    } catch (e) { if (t === tries) throw e; await sleep(1500 * t); }
  }
}

const manifest = { extracted_at: new Date().toISOString(), caisse_id: ID, source: 'apiv2.lacaisse.ma + api-legacy.lacaisse.ma', not_extracted: ['suppliers', 'stock', 'users/privileges'], files: {}, months: [] };
const log = (...a) => console.log(...a);

// ── 1. catalogue + categories ───────────────────────────────────────────────
log('1) Catalogue & categories');
const info = { id_categorie: '', id_fournisseur: '-1', id_imprimante: '-1', IdCatFromFamille: '', etat_de_produit: '', ps: '-1', pv: '-1', vl: '-1', vd: '-1', ar: '-1', af: '-1', pf: '-1', pft: '-1', non_ps: '-1', non_pv: '-1', non_vl: '-1', non_vd: '-1', non_ar: '-1', non_af: '-1', non_pf: '-1', non_pft: '-1', search: '' };
if (!have('catalogue/articles.json')) {
  const arts = []; let total = 0;
  for (let p = 1; p <= 100; p++) {
    const j = await call('POST', `/api/v1/article/${ID}/${ID}/${p}`, { info: JSON.stringify(info) });
    total = j.count; if (!j.produits?.length) break; arts.push(...j.produits); if (arts.length >= total) break; await sleep(150);
  }
  save('catalogue/articles.json', { count: total, fetched: arts.length, articles: arts });
}
if (!have('catalogue/declinaisons.json')) save('catalogue/declinaisons.json', await call('GET', `/api/v1/ventes/declinaisons/${ID}`));
if (!have('catalogue/categories_visible.json')) {
  const rows = [];
  for (let p = 1; p <= 20; p++) { const j = await call('GET', `/api/v1/categories/${ID}/${p}/all`); if (!j.categories?.length) break; rows.push(...j.categories); if (rows.length >= j.count) break; }
  save('catalogue/categories_visible.json', rows);
}
if (!have('catalogue/categories_all.json')) save('catalogue/categories_all.json', await call('GET', `/api/v1/activitecomparer/getCategory/${ID}`));
const arts = readJson('catalogue/articles.json');
const catsVisible = readJson('catalogue/categories_visible.json');
const catsAll = readJson('catalogue/categories_all.json');
manifest.catalogue = {
  articles: arts.articles.length, articles_reported_count: arts.count,
  categories_visible: catsVisible.length, categories_all: catsAll.length, categories_hidden: catsAll.length - catsVisible.length,
  articles_with_image: arts.articles.filter((a) => a.image).length,
  sum_nb_produits: catsVisible.reduce((s, c) => s + (c.nb_produits || 0), 0),
};
log('   ', JSON.stringify(manifest.catalogue));

// ── month list ──────────────────────────────────────────────────────────────
const fmtUS = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
const fmtDDMMYY = (d, sep) => `${String(d.getDate()).padStart(2, '0')}${sep}${String(d.getMonth() + 1).padStart(2, '0')}${sep}${String(d.getFullYear()).slice(2)}`;
async function exportLines(start, end) {
  const u = new URL(`${LEGACY}/export_excel.php`);
  u.searchParams.set('caisse', ID); u.searchParams.set('startDate', fmtUS(start)); u.searchParams.set('endDate', fmtUS(end));
  u.searchParams.set('token_api', auth.licence); u.searchParams.set('idcaisselist', ID);
  for (let t = 1; t <= 3; t++) {
    const r = await fetch(u); if (r.ok) return Buffer.from(await r.arrayBuffer());
    await sleep(2000 * t);
  }
  throw new Error('export_excel failed');
}
const fixMojibake = (s) => { if (typeof s !== 'string' || !/[ÃÂ]/.test(s)) return s; try { return Buffer.from(s, 'latin1').toString('utf8'); } catch { return s; } };
const parseXlsx = (buf) => {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });
  return rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [fixMojibake(k), fixMojibake(v)])));
};
const excelDate = (n) => (typeof n === 'number' ? new Date((n - 25569) * 86400000).toISOString().slice(0, 10) : null);
const num = (v) => { const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };

log('2) Finding the first sale');
const probe = parseXlsx(await exportLines(new Date(2023, 0, 1), new Date()));
const probeDates = probe.map((r) => excelDate(r['Date'])).filter(Boolean).sort();
if (!probeDates.length) throw new Error('no sales found');
const first = new Date(probeDates[0] + 'T00:00:00');
log('    first sale date:', probeDates[0], '| last:', probeDates[probeDates.length - 1], '| lines in probe:', probe.length);
manifest.first_sale_date = probeDates[0]; manifest.last_sale_date = probeDates[probeDates.length - 1];

const months = [];
for (let y = first.getFullYear(), m = first.getMonth(); new Date(y, m, 1) <= new Date(); m++) {
  if (m > 11) { m = 0; y++; }
  const start = new Date(y, m, 1); const endFull = new Date(y, m + 1, 0); const end = endFull > new Date() ? new Date() : endFull;
  months.push({ key: `${y}-${String(m + 1).padStart(2, '0')}`, start, end });
}

// ── 2. sales + sessions, month by month ─────────────────────────────────────
log('3) Sales + till sessions, month by month');
const recon = [['month', 'tickets_listed', 'paid_tickets', 'cancelled', 'paid_sum_ticket_list', 'dashboard_ca', 'export_lines', 'export_sum', 'diff_list_vs_dashboard', 'diff_export_vs_dashboard', 'sessions', 'status']];
for (const mo of months) {
  const k = mo.key; const a = fmtDDMMYY(mo.start, '-'); const b = fmtDDMMYY(mo.end, '-');
  // ticket list
  const tf = `sales/tickets/tickets_${k}.json`;
  if (!have(tf)) {
    const rows = []; let count = 0;
    for (let p = 1; p <= 400; p++) {
      const j = await call('GET', `/api/v1/ventes/${ID}/${a}/${b}/${p}`);
      count = j.count; if (!j.ventes?.length) break; rows.push(...j.ventes); if (rows.length >= count) break; await sleep(120);
    }
    save(tf, { month: k, count, fetched: rows.length, tickets: rows });
  }
  const tk = readJson(tf);
  // excel lines
  const lf = `sales/lines/lines_${k}`;
  let lines;
  if (!have(lf + '.json')) {
    const buf = await exportLines(mo.start, mo.end); save(lf + '.xlsx', buf); lines = parseXlsx(buf);
    save(lf + '.json', { month: k, sha256_xlsx: sha(buf), rows: lines });
  } else lines = readJson(lf + '.json').rows;
  // sessions
  const sf = `sessions/sessions_${k}.json`;
  if (!have(sf)) {
    const rows = []; let count = 0;
    for (let p = 1; p <= 50; p++) {
      const j = await call('POST', `/api/v1/journal/${ID}/${a}/${b}/${p}`, { info: { dateDebut: a, dateFin: b, listcaisses: '' } });
      count = j.count; if (!j.journaux?.length) break; rows.push(...j.journaux); if (rows.length >= count) break; await sleep(120);
    }
    save(sf, { month: k, count, fetched: rows.length, sessions: rows });
  }
  const ss = readJson(sf);
  // dashboard figure for the same month
  const dash = await call('POST', `/api/v1/activite/${ID}`, { info: { dateDebut: fmtDDMMYY(mo.start, '/'), dateFin: fmtDDMMYY(mo.end, '/'), listcaisses: null } });
  const dashCa = num(dash?.data?.moyennesnumber_affaire?.number_affaire);
  const paid = tk.tickets.filter((t) => t.statut === 'Payee'); const paidSum = paid.reduce((s, t) => s + num(t.prix), 0);
  const exportSum = lines.reduce((s, r) => s + num(r['Prix de vente']), 0);
  const d1 = Math.round((paidSum - dashCa) * 100) / 100; const d2 = Math.round((exportSum - dashCa) * 100) / 100;
  const status = tk.count === tk.fetched && Math.abs(d1) < 0.5 && Math.abs(d2) < 0.5 ? 'OK' : 'CHECK';
  recon.push([k, tk.fetched, paid.length, tk.tickets.filter((t) => t.statut === 'Annulee').length, paidSum.toFixed(2), dashCa.toFixed(2), lines.length, exportSum.toFixed(2), d1, d2, ss.fetched, status]);
  manifest.months.push({ month: k, tickets: tk.fetched, tickets_reported: tk.count, paid: paid.length, paid_sum: Math.round(paidSum * 100) / 100, dashboard_ca: dashCa, lines: lines.length, lines_sum: Math.round(exportSum * 100) / 100, sessions: ss.fetched, status });
  log(`    ${k}  tickets ${String(tk.fetched).padStart(4)}/${String(tk.count).padStart(4)}  paid ${String(paid.length).padStart(4)}  CA list ${paidSum.toFixed(2).padStart(10)}  dashboard ${dashCa.toFixed(2).padStart(10)}  lines ${String(lines.length).padStart(5)} sum ${exportSum.toFixed(2).padStart(10)}  sessions ${String(ss.fetched).padStart(3)}  ${status}`);
  await sleep(200);
}

// ── manifest + README ───────────────────────────────────────────────────────
save('reconciliation.csv', recon.map((r) => r.join(',')).join('\n'));
const tot = (f) => manifest.months.reduce((s, m) => s + m[f], 0);
manifest.totals = { months: manifest.months.length, tickets: tot('tickets'), paid_tickets: tot('paid'), lines: tot('lines'), sessions: tot('sessions'), paid_sum: Math.round(tot('paid_sum') * 100) / 100, dashboard_sum: Math.round(tot('dashboard_ca') * 100) / 100, months_ok: manifest.months.filter((m) => m.status === 'OK').length };
save('manifest.json', manifest);
save('README.txt', `LaCaisse extraction ${manifest.extracted_at}\nCaisse ${ID}\nFirst sale ${manifest.first_sale_date}, last ${manifest.last_sale_date}\n\ncatalogue/   articles.json (all articles), categories_visible.json, categories_all.json (incl. hidden), declinaisons.json\nsales/tickets/  one file per month: ticket list (id, date, client, amount, status, on-site/takeaway)\nsales/lines/    one file per month: raw .xlsx export + parsed .json (every sold line)\nsessions/       one file per month: till sessions (open/close, cashier)\nreconciliation.csv  per month: ticket list vs dashboard vs Excel lines\nmanifest.json       counts and totals\n\nNot extracted on purpose: suppliers, stock, users/privileges (passwords).\nNote: sales lines contain customer names/phones where the POS recorded them. Keep this folder private.\n`);
log('\nDONE. Output:', OUT);
log('Totals:', JSON.stringify(manifest.totals));
