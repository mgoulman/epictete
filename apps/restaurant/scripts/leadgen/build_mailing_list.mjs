// One clean email per company for the corporate-lunch proposition mailing.
// Merges Hunter + crawled emails, picks the BEST single contact per company
// (keyed by domain so no company repeats), writes out/mailing_list.xlsx.
//   node scripts/leadgen/build_mailing_list.mjs

import ExcelJS from 'exceljs';
import { readCSV, writeCSV, OUT } from './lib.mjs';
import path from 'node:path';

const read = (n) => { try { return readCSV(n); } catch { return []; } };
const hunter = read('emails_deliverable.csv');
const crawled = read('emails_crawled_ondomain.csv');

const GENERIC = /^(contact|direction|rh|hr|administration|admin|info|commercial|achat)@/i;

// Higher score = better target for a catering/staff-perks proposition.
function score(row, source) {
  const email = (row.email || '').toLowerCase();
  if (source === 'hunter') {
    const dept = (row.department || '').toLowerCase();
    if (['executive', 'management'].includes(dept)) return 6;
    if (dept === 'hr') return 5;
    if (dept === 'administrative') return 4;
    if (GENERIC.test(email)) return 4;       // verified generic inbox
    return 3;                                 // verified named, other dept
  }
  // crawled (real but unverified)
  if (/^(contact|direction|rh|hr)@/i.test(email)) return 2.5;
  if (GENERIC.test(email)) return 2;
  return 1;
}

// Pick the best row per domain.
const best = new Map(); // domain -> { entry, score }
const consider = (row, source) => {
  const domain = (row.domain || '').toLowerCase();
  const email = (row.email || '').toLowerCase();
  if (!domain || !email) return;
  const s = score(row, source);
  const cur = best.get(domain);
  if (!cur || s > cur.score) {
    best.set(domain, {
      score: s,
      entry: {
        Entreprise: row.company || '',
        Email: row.email,
        Téléphone: row.phone || '',
        Domaine: domain,
        Contact: source === 'hunter' ? `${row.first_name || ''} ${row.last_name || ''}`.trim() : '',
        Source: source === 'hunter' ? 'Hunter (vérifié)' : 'Site web',
      },
    });
  }
};
for (const r of hunter) consider(r, 'hunter');
for (const r of crawled) consider(r, 'crawl');

const rows = [...best.values()].map((v) => v.entry)
  .sort((a, b) => a.Entreprise.localeCompare(b.Entreprise, 'fr'));

// CSV (simple) + XLSX (formatted)
writeCSV('mailing_list.csv', rows, ['Entreprise', 'Email', 'Téléphone', 'Domaine', 'Contact', 'Source']);

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet('Mailing', { views: [{ state: 'frozen', ySplit: 1 }] });
ws.columns = [
  { header: 'Entreprise', key: 'Entreprise', width: 38 },
  { header: 'Email', key: 'Email', width: 34 },
  { header: 'Téléphone', key: 'Téléphone', width: 18 },
  { header: 'Domaine', key: 'Domaine', width: 24 },
  { header: 'Contact', key: 'Contact', width: 22 },
  { header: 'Source', key: 'Source', width: 16 },
];
rows.forEach((r) => ws.addRow(r));
const head = ws.getRow(1);
head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF606338' } };
head.height = 20;
ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 6 } };

await wb.xlsx.writeFile(path.join(OUT, 'mailing_list.xlsx'));
console.log(`Wrote out/mailing_list.xlsx + out/mailing_list.csv — ${rows.length} unique companies (1 email each).`);
