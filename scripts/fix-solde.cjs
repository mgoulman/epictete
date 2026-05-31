const XLSX = require('xlsx');
const wb = XLSX.readFile('Suivi_Financier_Restaurant.xlsx');
const ws = wb.Sheets['Suivi Journalier'];
const wsLegend = wb.Sheets['Légende & Instructions'];

// Update Solde Théorique formula: D - (H + E + F + G)
// D = Total Recettes, E = Dépenses Caisse, F = Dépenses Carte Pro, G = Dépenses TPE, H = Retraits Total
for (let r = 6; r <= 36; r++) {
  ws['K' + r] = { t: 's', v: '-', f: 'IFERROR(D' + r + '-(H' + r + '+E' + r + '+F' + r + '+G' + r + '),"-")' };
}

// Update legend description
ws['K37'] = { t: 'n', v: 0, f: 'SUM(K6:K36)' };

// Fix legend Solde description
wsLegend['B18'] = { t: 's', v: 'Total Recettes - (Total Retraits + Total Dépenses) — calcul automatique' };

XLSX.writeFile(wb, 'Suivi_Financier_Restaurant.xlsx');
console.log('Solde formula updated: D - (H + E + F + G)');

// Verify
const wb2 = XLSX.readFile('Suivi_Financier_Restaurant.xlsx');
const ws2 = wb2.Sheets['Suivi Journalier'];
console.log('K6:', ws2['K6']?.f);
console.log('K7:', ws2['K7']?.f);
