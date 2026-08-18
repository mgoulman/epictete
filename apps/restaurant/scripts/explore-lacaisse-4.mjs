// Pin down which subset of detailed lines match the dashboard 1,323,885.74 / 4,231 trans / 8,533 couverts
import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';

const buf = readFileSync('/tmp/lacaisse_detailed.xlsx');
const rows = XLSX.utils.sheet_to_json(XLSX.read(buf, { type: 'buffer' }).Sheets['Sheet1'], { defval: null });

const num = (v) => Number(v) || 0;
const qty = (r) => num(r['QuantitÃ©'] ?? r['Quantité']);
const price = (r) => num(r['Prix de vente']);
const oid = (r) => r['Id commande'];
const tid = (r) => r['Num ticket'];

// 1) Group by Id commande first, drop those without
const orders = new Map();
for (const r of rows) {
  const o = oid(r);
  if (o == null) continue;
  if (!orders.has(o)) orders.set(o, { revenue: 0, qty: 0, channel: r['Canal de vente'], surPlace: r['SurPlace'], lines: 0, ticket: r['Num ticket'] });
  const e = orders.get(o);
  e.revenue += price(r) * qty(r);
  e.qty += qty(r);
  e.lines += 1;
}
console.log('=== With Id commande only ===');
console.log('  distinct orders:', orders.size);
let totalRev = 0, totalQty = 0;
for (const e of orders.values()) { totalRev += e.revenue; totalQty += e.qty; }
console.log('  total revenue:', totalRev.toFixed(2));
console.log('  total qty:', totalQty);
console.log('  avg/order:', (totalRev/orders.size).toFixed(2));

// 2) Now do same per-channel within Id-commande set
const perChannel = new Map();
for (const e of orders.values()) {
  if (!perChannel.has(e.channel)) perChannel.set(e.channel, { revenue: 0, qty: 0, orders: 0 });
  const c = perChannel.get(e.channel);
  c.revenue += e.revenue; c.qty += e.qty; c.orders += 1;
}
console.log('\n=== With Id commande only, grouped by Canal ===');
for (const [ch, c] of perChannel) console.log(`  ${ch}: rev=${c.revenue.toFixed(2)} qty=${c.qty} orders=${c.orders}`);

// 3) The 84,069 Livraison rows have NO Id commande. Try grouping by ticket_number for those
const livraisonNoOid = rows.filter(r => r['Canal de vente'] === 'Livraison' && oid(r) == null);
console.log('\n=== Livraison without Id commande ===');
console.log('  rows:', livraisonNoOid.length);
const lTicketRev = new Map();
for (const r of livraisonNoOid) {
  const t = String(tid(r));
  lTicketRev.set(t, (lTicketRev.get(t) || 0) + price(r) * qty(r));
}
console.log('  distinct tickets:', lTicketRev.size);
console.log('  total revenue:', [...lTicketRev.values()].reduce((a, b) => a + b, 0).toFixed(2));

// 4) Maybe the dashboard's CA = sum of (prix de vente * qty) MINUS sub-products that are inclusions?
//    Look at "Type" column or "Sous produit"-related signals
const types = new Set(rows.map(r => r['Type']));
console.log('\n=== rows by Type column ===');
for (const t of types) {
  const subset = rows.filter(r => r['Type'] === t);
  const rev = subset.reduce((s, r) => s + price(r) * qty(r), 0);
  console.log(`  "${t}": rows=${subset.length} rev=${rev.toFixed(2)}`);
}

// 5) Try distinct ticket grouping with line-level dedup (same product+qty+price within a ticket)
const ticketNet = new Map();
const seen = new Set();
for (const r of rows) {
  const t = String(tid(r));
  const key = `${t}|${r['Produit']}|${r['DÃ©clinaison'] ?? r['Déclinaison']}|${qty(r)}|${price(r)}`;
  if (seen.has(key)) continue;
  seen.add(key);
  ticketNet.set(t, (ticketNet.get(t) || 0) + price(r) * qty(r));
}
console.log('\n=== Per-ticket dedup (ticket+product+decli+qty+price) ===');
console.log('  distinct tickets:', ticketNet.size);
console.log('  total revenue:', [...ticketNet.values()].reduce((a, b) => a + b, 0).toFixed(2));

// 6) Dashboard hint: 1,323,885.74 / 4,231 transactions = 312.90 avg ticket
console.log('\nDashboard target: 1,323,885.74 MAD / 4,231 trans / 8,533 couverts');
console.log('  Implied avg ticket:', (1323885.74/4231).toFixed(2));
console.log('  Implied couverts/trans:', (8533/4231).toFixed(2));
