const XLSX = require('xlsx');

const wb = XLSX.readFile('/Users/macbook/Desktop/epictelerestaurant/Suivi_Financier_Restaurant.xlsx');
const ws = wb.Sheets['Suivi Journalier'];
const wsLegend = wb.Sheets['Légende & Instructions'];
const wsRecap = wb.Sheets['Récap Mensuel'];

// ─── 1. SUIVI JOURNALIER: Insert column G (shift G→K to H→L) ───
const range = XLSX.utils.decode_range(ws['!ref']);
for (let r = 0; r <= range.e.r; r++) {
  for (let c = range.e.c; c >= 6; c--) {
    const srcAddr = XLSX.utils.encode_cell({ r, c });
    const dstAddr = XLSX.utils.encode_cell({ r, c: c + 1 });
    if (ws[srcAddr]) {
      ws[dstAddr] = { ...ws[srcAddr] };
    } else {
      delete ws[dstAddr];
    }
  }
  delete ws[XLSX.utils.encode_cell({ r, c: 6 })];
}
ws['!ref'] = 'A1:L37';

// ─── 2. Add header ───
ws['G5'] = { t: 's', v: 'Dépenses TPE' };

// ─── 3. Update merges ───
ws['!merges'] = [
  { s: { c: 0, r: 0 }, e: { c: 11, r: 0 } },
  { s: { c: 0, r: 1 }, e: { c: 11, r: 1 } },
  { s: { c: 1, r: 3 }, e: { c: 3, r: 3 } },
  { s: { c: 4, r: 3 }, e: { c: 6, r: 3 } },
  { s: { c: 7, r: 3 }, e: { c: 9, r: 3 } },
];

// ─── 4. Update Solde Théorique formulas (now col K) ───
for (let r = 5; r <= 35; r++) {
  const row = r + 1;
  const addr = XLSX.utils.encode_cell({ r, c: 10 });
  ws[addr] = { t: 'n', f: 'IFERROR(D' + row + '-E' + row + '-F' + row + '-G' + row + '-I' + row + ',"-")' };
}

// ─── 5. Row 37 SUM formulas ───
ws['G37'] = { t: 'n', f: 'SUM(G6:G36)' };
ws['H37'] = { t: 'n', f: 'SUM(H6:H36)' };
ws['I37'] = { t: 'n', f: 'SUM(I6:I36)' };
ws['J37'] = { t: 'n', f: 'SUM(J6:J36)' };
ws['K37'] = { t: 'n', f: 'SUM(K6:K36)' };

// ─── 6. Récap Mensuel ───
const recapRange = XLSX.utils.decode_range(wsRecap['!ref']);
for (let r = 11; r >= 7; r--) {
  for (let c = 0; c <= recapRange.e.c; c++) {
    const srcAddr = XLSX.utils.encode_cell({ r, c });
    const dstAddr = XLSX.utils.encode_cell({ r: r + 1, c });
    if (wsRecap[srcAddr]) {
      wsRecap[dstAddr] = { ...wsRecap[srcAddr] };
    } else {
      delete wsRecap[dstAddr];
    }
  }
}
for (let c = 0; c <= recapRange.e.c; c++) {
  delete wsRecap[XLSX.utils.encode_cell({ r: 7, c })];
}

wsRecap['A8'] = { t: 's', v: 'Total Dépenses TPE' };
wsRecap['B8'] = { t: 'n', f: "'Suivi Journalier'!G37" };
wsRecap['B9'] = { t: 'n', f: "'Suivi Journalier'!H37" };
wsRecap['B10'] = { t: 'n', f: "'Suivi Journalier'!I37" };
wsRecap['B11'] = { t: 'n', f: "'Suivi Journalier'!J37" };
wsRecap['B12'] = { t: 'n', f: "'Suivi Journalier'!K37" };

wsRecap['C6'] = { t: 'n', f: 'IFERROR(B6/B5,"-")' };
wsRecap['C7'] = { t: 'n', f: 'IFERROR(B7/B5,"-")' };
wsRecap['C8'] = { t: 'n', f: 'IFERROR(B8/B5,"-")' };
wsRecap['C9'] = { t: 'n', f: 'IFERROR(B9/B5,"-")' };
wsRecap['C10'] = { t: 'n', f: 'IFERROR(B10/B5,"-")' };
wsRecap['C11'] = { t: 'n', f: 'IFERROR(B11/B5,"-")' };
wsRecap['C12'] = { t: 'n', f: 'IFERROR(B12/B5,"-")' };

wsRecap['!ref'] = 'A1:G12';

// ─── 7. Légende ───
const legendRange = XLSX.utils.decode_range(wsLegend['!ref']);
for (let r = legendRange.e.r; r >= 13; r--) {
  for (let c = 0; c <= legendRange.e.c; c++) {
    const srcAddr = XLSX.utils.encode_cell({ r, c });
    const dstAddr = XLSX.utils.encode_cell({ r: r + 1, c });
    if (wsLegend[srcAddr]) {
      wsLegend[dstAddr] = { ...wsLegend[srcAddr] };
    } else {
      delete wsLegend[dstAddr];
    }
  }
}
wsLegend['A13'] = { t: 's', v: 'Dépenses TPE' };
wsLegend['B13'] = { t: 's', v: 'Dépenses réglées via le terminal de paiement électronique (TPE)' };
wsLegend['!ref'] = 'A1:B' + (legendRange.e.r + 2);

// ─── 8. Write ───
XLSX.writeFile(wb, '/Users/macbook/Desktop/epictelerestaurant/Suivi_Financier_Restaurant.xlsx');
console.log('Done! Column "Dépenses TPE" added successfully.');
