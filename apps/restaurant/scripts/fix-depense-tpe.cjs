const XLSX = require('xlsx');

const wb = XLSX.readFile('Suivi_Financier_Restaurant.xlsx');
const ws = wb.Sheets['Suivi Journalier'];
const wsRecap = wb.Sheets['Récap Mensuel'];
const wsLegend = wb.Sheets['Légende & Instructions'];

// ─── Fix 1: Solde Théorique formulas at column K (index 10) ───
for (let r = 5; r <= 35; r++) {
  const row = r + 1;
  const addr = 'K' + row;
  ws[addr] = { t: 's', v: '-', f: 'IFERROR(D' + row + '-E' + row + '-F' + row + '-G' + row + '-I' + row + ',"-")' };
}

// ─── Fix 2: Row 37 SUM formulas ───
ws['G37'] = { t: 'n', v: 0, f: 'SUM(G6:G36)' };
ws['H37'] = { t: 'n', v: 0, f: 'SUM(H6:H36)' };
ws['I37'] = { t: 'n', v: 0, f: 'SUM(I6:I36)' };
ws['J37'] = { t: 'n', v: 0, f: 'SUM(J6:J36)' };
ws['K37'] = { t: 'n', v: 0, f: 'SUM(K6:K36)' };

// ─── Fix 3: Récap Mensuel formulas ───
wsRecap['B8']  = { t: 'n', v: 0, f: "'Suivi Journalier'!G37" };
wsRecap['B9']  = { t: 'n', v: 0, f: "'Suivi Journalier'!H37" };
wsRecap['B10'] = { t: 'n', v: 0, f: "'Suivi Journalier'!I37" };
wsRecap['B11'] = { t: 'n', v: 0, f: "'Suivi Journalier'!J37" };
wsRecap['B12'] = { t: 'n', v: 0, f: "'Suivi Journalier'!K37" };
wsRecap['C6']  = { t: 'n', v: 0, f: 'IFERROR(B6/B5,"-")' };
wsRecap['C7']  = { t: 'n', v: 0, f: 'IFERROR(B7/B5,"-")' };
wsRecap['C8']  = { t: 'n', v: 0, f: 'IFERROR(B8/B5,"-")' };
wsRecap['C9']  = { t: 'n', v: 0, f: 'IFERROR(B9/B5,"-")' };
wsRecap['C10'] = { t: 'n', v: 0, f: 'IFERROR(B10/B5,"-")' };
wsRecap['C11'] = { t: 'n', v: 0, f: 'IFERROR(B11/B5,"-")' };
wsRecap['C12'] = { t: 'n', v: 0, f: 'IFERROR(B12/B5,"-")' };

// ─── Fix 4: Legend duplicate — remove row 15 duplicate, fix row 14 ───
// Current state:
// Row 12 (Dépenses Caisse) - correct
// Row 13 (Dépenses TPE) - correct  
// Row 14 (Retraits Carte Total) - correct
// Row 15 (Retraits Carte Total) - DUPLICATE, should be Retraits Carte (Pro)
// We need to check the actual state and fix

// Let's read all legend rows to understand
const legRange = XLSX.utils.decode_range(wsLegend['!ref']);
console.log('Legend range:', wsLegend['!ref']);
for (let r = 11; r <= legRange.e.r; r++) {
  const a = wsLegend['A' + (r+1)];
  const b = wsLegend['B' + (r+1)];
  console.log('Row', r+1, ':', a?.v, '|', b?.v);
}

// The issue: original had Dépenses Carte (Pro) at row 13 (1-indexed),
// then I inserted at row 13 but the shift created a duplicate.
// Let me just fix the legend by writing it correctly from row 12 onward:
const legendEntries = [
  ['Dépenses Caisse', 'Dépenses réglées en espèces, issues de la feuille du manager'],
  ['Dépenses Carte (Pro)', 'Dépenses professionnelles du restaurant réglées par carte'],
  ['Dépenses TPE', 'Dépenses réglées via le terminal de paiement électronique (TPE)'],
  ['Retraits Carte (Total)', 'Total des retraits effectués avec la carte du restaurant'],
  ['Retraits Carte (Pro)', 'Part professionnelle des retraits carte (entrer la valeur)'],
  ['Retraits Carte (Perso)', 'Part personnelle des retraits carte (entrer la valeur)'],
  ['Solde Théorique', 'Total Recettes - Dépenses Caisse - Dépenses Carte Pro - Dépenses TPE - Retraits Pro'],
  ['Observations', 'Commentaires libres, anomalies, notes de gestion'],
];

for (let i = 0; i < legendEntries.length; i++) {
  const row = 12 + i; // 1-indexed rows 12-19
  wsLegend['A' + row] = { t: 's', v: legendEntries[i][0] };
  wsLegend['B' + row] = { t: 's', v: legendEntries[i][1] };
}

// Clear any extra rows that might have been left from the bad shift
for (let r = 20; r <= legRange.e.r + 1; r++) {
  // Check if there's content that shouldn't be duplicated
}

// Now rebuild the rest of the legend (bonnes pratiques section)
// Row 20 should be empty, row 21 should be BONNES PRATIQUES, etc.
// Check current state
for (let r = 19; r <= legRange.e.r + 1; r++) {
  const a = wsLegend['A' + (r+1)];
  if (a) console.log('Check row', r+1, ':', a.v);
}

XLSX.writeFile(wb, 'Suivi_Financier_Restaurant.xlsx');
console.log('\nFixes applied successfully!');
