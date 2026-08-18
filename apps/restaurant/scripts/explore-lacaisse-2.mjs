// Inspect what's actually in the detailed export and break down by Caisse + Date
import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';

const buf = readFileSync('/tmp/lacaisse_detailed.xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
console.log('Total rows:', rows.length);

// Unique caisses
const byCaisse = new Map();
const byChannel = new Map();
const byCaisseChannel = new Map();
let totalRevenue = 0;
let totalQty = 0;
const orderIds = new Set();
const ticketIds = new Set();

const dateCol = 'Date';
const minDate = { v: Infinity }, maxDate = { v: -Infinity };

for (const r of rows) {
  const caisse = r['Caisse'] ?? 'Unknown';
  const channel = r['Canal de vente'] ?? 'Unknown';
  const price = Number(r['Prix de vente']) || 0;
  const qty = Number(r['QuantitÃ©'] || r['Quantité']) || 1;
  const oid = r['Id commande'];
  const tid = r['Num ticket'];
  const d = r[dateCol];

  totalRevenue += price * qty;
  totalQty += qty;
  if (oid != null) orderIds.add(String(oid));
  if (tid != null) ticketIds.add(String(tid));

  byCaisse.set(caisse, (byCaisse.get(caisse) || 0) + 1);
  byChannel.set(channel, (byChannel.get(channel) || 0) + 1);
  const ck = `${caisse} | ${channel}`;
  byCaisseChannel.set(ck, (byCaisseChannel.get(ck) || 0) + 1);

  if (typeof d === 'number') {
    if (d < minDate.v) minDate.v = d;
    if (d > maxDate.v) maxDate.v = d;
  }
}

const excelToISO = (n) => {
  if (typeof n !== 'number') return null;
  const ms = (n - 25569) * 86400 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
};

console.log('\nDate range (Excel serial):', minDate.v, '→', maxDate.v);
console.log('Date range (ISO):', excelToISO(minDate.v), '→', excelToISO(maxDate.v));
console.log('Distinct order ids:', orderIds.size);
console.log('Distinct ticket numbers:', ticketIds.size);
console.log('Total revenue (sum prix de vente × qty):', totalRevenue.toFixed(2));
console.log('Total quantity:', totalQty);

console.log('\n=== rows by Caisse ===');
[...byCaisse.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

console.log('\n=== rows by Canal de vente ===');
[...byChannel.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

console.log('\n=== rows by Caisse|Canal ===');
[...byCaisseChannel.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

// Filter to Epictete-named caisses if any
const epiRows = rows.filter(r => /epi|EPICTETE/i.test(String(r['Caisse'] || '')));
console.log('\n=== Rows where Caisse matches /epi/i ===', epiRows.length);
if (epiRows.length) {
  let rev = 0, qty = 0;
  const oids = new Set(), tids = new Set();
  for (const r of epiRows) {
    rev += (Number(r['Prix de vente']) || 0) * (Number(r['QuantitÃ©'] || r['Quantité']) || 1);
    qty += Number(r['QuantitÃ©'] || r['Quantité']) || 1;
    if (r['Id commande'] != null) oids.add(String(r['Id commande']));
    if (r['Num ticket'] != null) tids.add(String(r['Num ticket']));
  }
  console.log('  Epictete revenue:', rev.toFixed(2));
  console.log('  Epictete qty:', qty);
  console.log('  Epictete distinct order_ids:', oids.size);
  console.log('  Epictete distinct ticket_numbers:', tids.size);
}
