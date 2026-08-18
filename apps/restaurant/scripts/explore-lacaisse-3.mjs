// Reconcile our detailed export with LaCaisse dashboard's 1,323,885.74 / 4,231 trans / 8,533 couverts
import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';

const buf = readFileSync('/tmp/lacaisse_detailed.xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });

// Helpers
const num = (v) => Number(v) || 0;
const qty = (r) => num(r['QuantitÃ©'] ?? r['Quantité']);
const price = (r) => num(r['Prix de vente']);
const oid = (r) => r['Id commande'];
const tid = (r) => r['Num ticket'];

// 1) Try deduping repeated identical rows
console.log('Total rows:', rows.length);

// 2) Filter out zero-price rows (free included items?)
const nonZero = rows.filter(r => price(r) > 0);
console.log('\nRows with price > 0:', nonZero.length);
let nzRev = 0, nzQty = 0; const nzO = new Set(), nzT = new Set();
for (const r of nonZero) { nzRev += price(r) * qty(r); nzQty += qty(r); if (oid(r)!=null) nzO.add(String(oid(r))); if (tid(r)!=null) nzT.add(String(tid(r))); }
console.log('  Revenue:', nzRev.toFixed(2), 'Qty:', nzQty, 'Orders:', nzO.size, 'Tickets:', nzT.size);

// 3) Group by order_id and summarize
const byOrder = new Map();
for (const r of rows) {
  const o = String(oid(r));
  if (!byOrder.has(o)) byOrder.set(o, { revenue: 0, qty: 0, lines: 0, channel: r['Canal de vente'] });
  const ent = byOrder.get(o);
  ent.revenue += price(r) * qty(r);
  ent.qty += qty(r);
  ent.lines += 1;
}
let totalRev = 0;
for (const v of byOrder.values()) totalRev += v.revenue;
console.log('\nGrouped by order_id:');
console.log('  distinct orders:', byOrder.size);
console.log('  total revenue:', totalRev.toFixed(2));
console.log('  avg per order:', (totalRev / byOrder.size).toFixed(2));

// 4) Try filtering by channel — dashboard might only show "Sur place" or exclude GLOVO
const channels = new Set(rows.map(r => r['Canal de vente']));
console.log('\nRevenue by Canal de vente:');
for (const ch of channels) {
  let rev = 0; let q = 0; const o = new Set();
  for (const r of rows) if (r['Canal de vente'] === ch) { rev += price(r) * qty(r); q += qty(r); if (oid(r)!=null) o.add(String(oid(r))); }
  console.log(`  ${ch}: rev=${rev.toFixed(2)} qty=${q} orders=${o.size}`);
}

// 5) Try filtering by SurPlace
const surPlace = new Set(rows.map(r => r['SurPlace']));
console.log('\nRevenue by SurPlace:');
for (const sp of surPlace) {
  let rev = 0; let q = 0; const o = new Set();
  for (const r of rows) if (r['SurPlace'] === sp) { rev += price(r) * qty(r); q += qty(r); if (oid(r)!=null) o.add(String(oid(r))); }
  console.log(`  "${sp}": rev=${rev.toFixed(2)} qty=${q} orders=${o.size}`);
}

// 6) Try by Type de vente
const sv = new Set(rows.map(r => r['Type de vente']));
console.log('\nRevenue by Type de vente:');
for (const t of sv) {
  let rev = 0; let q = 0; const o = new Set();
  for (const r of rows) if (r['Type de vente'] === t) { rev += price(r) * qty(r); q += qty(r); if (oid(r)!=null) o.add(String(oid(r))); }
  console.log(`  "${t}": rev=${rev.toFixed(2)} qty=${q} orders=${o.size}`);
}

// 7) Compare to dashboard target: 1,323,885.74 with 4,231 transactions and 8,533 couverts
// Maybe the dashboard sum uses HT (excluding TVA)?
let totalHT = 0;
for (const r of rows) {
  const tva = num(r['TVA']) || 10;
  totalHT += (price(r) * qty(r)) / (1 + tva / 100);
}
console.log('\nTotal HT (assuming TVA on Prix de vente):', totalHT.toFixed(2));

// 8) Maybe the dashboard shows benefice (profit) not revenue
let totalProfit = 0;
for (const r of rows) totalProfit += num(r['BÃ©nÃ©fice'] ?? r['Bénéfice']);
console.log('Total Bénéfice:', totalProfit.toFixed(2));
