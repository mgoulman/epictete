// Build a clean, formatted Excel workbook from the out/*.csv lead-gen files.
//   node scripts/leadgen/to_xlsx.mjs   →  out/leads.xlsx
// Sheets: Master (deduped contacts), Entreprises, Emails (Hunter), Emails (Site web).

import ExcelJS from 'exceljs';
import { readCSV, OUT } from './lib.mjs';
import path from 'node:path';
import fs from 'node:fs';

const read = (name) => { try { return readCSV(name); } catch { return []; } };

const companies = read('companies.csv');
const hunter = read('emails_deliverable.csv');
const crawled = read('emails_crawled_ondomain.csv');

// ── Master: merge Hunter (named, verified) + crawled (on-domain), dedupe by email ──
const master = [];
const seen = new Set();
const addRow = (r) => {
  const email = (r.Email || '').toLowerCase();
  if (!email || seen.has(email)) return;
  seen.add(email); master.push(r);
};
for (const e of hunter) addRow({
  Entreprise: e.company, Email: e.email, Prénom: e.first_name, Nom: e.last_name,
  Poste: e.position, Téléphone: e.phone, Adresse: e.address, Domaine: e.domain,
  Source: 'Hunter (vérifié)', Confiance: e.verify_score || e.hunter_confidence || '',
});
for (const e of crawled) addRow({
  Entreprise: e.company, Email: e.email, Prénom: '', Nom: '',
  Poste: '', Téléphone: e.phone, Adresse: e.address, Domaine: e.domain,
  Source: 'Site web', Confiance: '',
});

const wb = new ExcelJS.Workbook();
wb.creator = 'leadgen';

// Add a sheet from an array of objects, with header styling + widths + autofilter.
function addSheet(name, rows, columns) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  rows.forEach((r) => ws.addRow(r));
  // Header style
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF606338' } };
  head.alignment = { vertical: 'middle' };
  head.height = 20;
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  // Wrap long address columns
  const addrCol = columns.findIndex((c) => /adresse|address/i.test(c.header));
  if (addrCol >= 0) ws.getColumn(addrCol + 1).alignment = { wrapText: true, vertical: 'top' };
  return ws;
}

addSheet('Master', master, [
  { header: 'Entreprise', key: 'Entreprise', width: 34 },
  { header: 'Email', key: 'Email', width: 32 },
  { header: 'Prénom', key: 'Prénom', width: 14 },
  { header: 'Nom', key: 'Nom', width: 16 },
  { header: 'Poste', key: 'Poste', width: 24 },
  { header: 'Téléphone', key: 'Téléphone', width: 18 },
  { header: 'Adresse', key: 'Adresse', width: 40 },
  { header: 'Domaine', key: 'Domaine', width: 22 },
  { header: 'Source', key: 'Source', width: 16 },
  { header: 'Confiance', key: 'Confiance', width: 10 },
]);

addSheet('Entreprises', companies, [
  { header: 'Nom', key: 'name', width: 38 },
  { header: 'Téléphone', key: 'phone', width: 18 },
  { header: 'Domaine', key: 'domain', width: 22 },
  { header: 'Site web', key: 'website', width: 30 },
  { header: 'Type', key: 'type', width: 16 },
  { header: 'Adresse', key: 'address', width: 44 },
]);

addSheet('Emails (Hunter)', hunter, [
  { header: 'Entreprise', key: 'company', width: 34 },
  { header: 'Email', key: 'email', width: 32 },
  { header: 'Prénom', key: 'first_name', width: 14 },
  { header: 'Nom', key: 'last_name', width: 16 },
  { header: 'Poste', key: 'position', width: 24 },
  { header: 'Département', key: 'department', width: 16 },
  { header: 'Statut', key: 'verify_status', width: 12 },
  { header: 'Score', key: 'verify_score', width: 8 },
  { header: 'Domaine', key: 'domain', width: 22 },
  { header: 'Téléphone', key: 'phone', width: 18 },
  { header: 'Adresse', key: 'address', width: 40 },
]);

addSheet('Emails (Site web)', crawled, [
  { header: 'Entreprise', key: 'company', width: 34 },
  { header: 'Email', key: 'email', width: 32 },
  { header: 'Source (page)', key: 'source_path', width: 18 },
  { header: 'Domaine', key: 'domain', width: 22 },
  { header: 'Téléphone', key: 'phone', width: 18 },
  { header: 'Adresse', key: 'address', width: 40 },
]);

const file = path.join(OUT, 'leads.xlsx');
await wb.xlsx.writeFile(file);
const kb = Math.round(fs.statSync(file).size / 1024);
console.log(`Wrote ${file} (${kb} KB)`);
console.log(`  Master: ${master.length} contacts · Entreprises: ${companies.length} · Hunter: ${hunter.length} · Site web: ${crawled.length}`);
