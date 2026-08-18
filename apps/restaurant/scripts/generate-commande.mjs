import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '..', 'excel-categories');
const inventaireFile = path.join(dir, 'Inventaire_Complet.xlsx');
const outputFile = path.join(dir, 'Commande.xlsx');

const categoryStyles = {
  "Légumes":              { header: '4CAF50', headerFont: 'FFFFFF', light: 'E8F5E9', medium: 'C8E6C9' },
  "Économat":             { header: 'FF9800', headerFont: 'FFFFFF', light: 'FFF3E0', medium: 'FFE0B2' },
  "Fromage":              { header: 'FFC107', headerFont: '333333', light: 'FFFDE7', medium: 'FFF9C4' },
  "Poisson":              { header: '2196F3', headerFont: 'FFFFFF', light: 'E3F2FD', medium: 'BBDEFB' },
  "Viande":               { header: 'F44336', headerFont: 'FFFFFF', light: 'FFEBEE', medium: 'FFCDD2' },
  "Économat Pdt Italien": { header: '9C27B0', headerFont: 'FFFFFF', light: 'F3E5F5', medium: 'E1BEE7' },
};

const fournisseurStyle = { header: '37474F', headerFont: 'FFFFFF', light: 'ECEFF1', medium: 'CFD8DC' };

const unitOptions = [
  'Kg','g','L','cl','ml','Pièce','Botte','Barquette',
  'Boîte','Sachet','Paquet','Bouteille','Pot','Rouleau',
  'Carton','Plateau','Filet','Douzaine',
];

const categoryNames = Object.keys(categoryStyles);

const thinBorder = {
  top:    { style: 'thin', color: { argb: 'CCCCCC' } },
  left:   { style: 'thin', color: { argb: 'CCCCCC' } },
  bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
  right:  { style: 'thin', color: { argb: 'CCCCCC' } },
};

// Read source workbook
const srcWb = new ExcelJS.Workbook();
await srcWb.xlsx.readFile(inventaireFile);

const outWb = new ExcelJS.Workbook();
outWb.creator = 'Epictète Restaurant';

// --- Process each category sheet ---
for (const [catName, catStyle] of Object.entries(categoryStyles)) {
  const srcWs = srcWb.getWorksheet(catName);
  if (!srcWs) {
    console.log(`⚠️  Sheet "${catName}" not found, skipping`);
    continue;
  }

  // Read existing data
  const products = [];
  srcWs.eachRow((row, num) => {
    if (num < 3) return;
    const produit = row.getCell(1).value;
    if (!produit) return;
    products.push({
      produit: produit,
      prix: row.getCell(2).value,
      unite: row.getCell(3).value,
    });
  });

  const ws = outWb.addWorksheet(catName.substring(0, 31));

  // 4 columns now: Produit, Prix, Unité, Quantité
  ws.columns = [
    { key: 'produit',  width: 30 },
    { key: 'prix',     width: 14 },
    { key: 'unite',    width: 16 },
    { key: 'quantite', width: 14 },
  ];

  // ROW 1 – Title
  ws.mergeCells('A1:D1');
  const titleCell = ws.getCell('A1');
  titleCell.value = catName.toUpperCase();
  titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: catStyle.headerFont } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catStyle.header } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = thinBorder;
  ws.getRow(1).height = 40;

  // ROW 2 – Headers
  const headerRow = ws.getRow(2);
  const headers = ['Produit', 'Prix (MAD)', 'Unité', 'Quantité'];
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catStyle.header } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top:    { style: 'medium', color: { argb: catStyle.header } },
      left:   { style: 'thin',   color: { argb: '999999' } },
      bottom: { style: 'medium', color: { argb: catStyle.header } },
      right:  { style: 'thin',   color: { argb: '999999' } },
    };
  });
  headerRow.height = 28;

  // DATA ROWS
  products.forEach((item, idx) => {
    const rowNum = idx + 3;
    const row = ws.getRow(rowNum);
    const bgColor = idx % 2 === 0 ? catStyle.light : catStyle.medium;

    // Produit
    const cellA = row.getCell(1);
    cellA.value = item.produit;
    cellA.font = { name: 'Calibri', size: 11 };
    cellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cellA.alignment = { vertical: 'middle', indent: 1 };
    cellA.border = thinBorder;

    // Prix
    const cellB = row.getCell(2);
    cellB.value = item.prix != null && item.prix !== '' ? item.prix : null;
    cellB.font = { name: 'Calibri', size: 11 };
    cellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cellB.alignment = { horizontal: 'center', vertical: 'middle' };
    cellB.border = thinBorder;
    cellB.numFmt = '#,##0.00';

    // Unité
    const cellC = row.getCell(3);
    cellC.value = item.unite || null;
    cellC.font = { name: 'Calibri', size: 11 };
    cellC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cellC.alignment = { horizontal: 'center', vertical: 'middle' };
    cellC.border = thinBorder;
    cellC.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${unitOptions.join(',')}"`],
      showDropDown: false,
    };

    // Quantité
    const cellD = row.getCell(4);
    cellD.font = { name: 'Calibri', size: 11 };
    cellD.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cellD.alignment = { horizontal: 'center', vertical: 'middle' };
    cellD.border = thinBorder;
    cellD.numFmt = '#,##0.00';

    row.height = 22;
  });

  const lastRow = products.length + 2;
  ws.views = [{ state: 'frozen', ySplit: 2, activeCell: 'A3' }];
  ws.autoFilter = { from: 'A2', to: `D${lastRow}` };
  ws.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1 };

  console.log(`✅ ${catName}: ${products.length} produits`);
}

// --- Fournisseur sheet ---
const srcFournWs = srcWb.getWorksheet('Fournisseurs');
const fournisseurs = [];
if (srcFournWs) {
  srcFournWs.eachRow((row, num) => {
    if (num < 3) return;
    const nom = row.getCell(1).value;
    if (!nom) return;
    fournisseurs.push({
      nom: String(nom).trim(),
      categorie: row.getCell(2).value ? String(row.getCell(2).value).trim() : '',
      telephone: row.getCell(3).value ? String(row.getCell(3).value).trim() : '',
    });
  });
}

const wsF = outWb.addWorksheet('Fournisseurs');

// 5 columns: Nom Complet, Catégorie, Numéro de Téléphone, Payé, Crédit
wsF.columns = [
  { key: 'nom',       width: 30 },
  { key: 'categorie', width: 24 },
  { key: 'telephone', width: 22 },
  { key: 'paye',      width: 16 },
  { key: 'credit',    width: 16 },
];

// ROW 1 – Title
wsF.mergeCells('A1:E1');
const fTitleCell = wsF.getCell('A1');
fTitleCell.value = 'FOURNISSEURS';
fTitleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: fournisseurStyle.headerFont } };
fTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fournisseurStyle.header } };
fTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
fTitleCell.border = thinBorder;
wsF.getRow(1).height = 40;

// ROW 2 – Headers
const fHeaderRow = wsF.getRow(2);
['Nom Complet', 'Catégorie', 'Numéro de Téléphone', 'Payé (MAD)', 'Crédit (MAD)'].forEach((h, i) => {
  const cell = fHeaderRow.getCell(i + 1);
  cell.value = h;
  cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fournisseurStyle.header } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border = {
    top:    { style: 'medium', color: { argb: fournisseurStyle.header } },
    left:   { style: 'thin',   color: { argb: '999999' } },
    bottom: { style: 'medium', color: { argb: fournisseurStyle.header } },
    right:  { style: 'thin',   color: { argb: '999999' } },
  };
});
fHeaderRow.height = 28;

// Data + extra empty rows
const totalFRows = Math.max(fournisseurs.length + 10, 30);
const categoryDropdown = categoryNames.join(',');

for (let idx = 0; idx < totalFRows; idx++) {
  const rowNum = idx + 3;
  const row = wsF.getRow(rowNum);
  const bgColor = idx % 2 === 0 ? fournisseurStyle.light : fournisseurStyle.medium;
  const item = fournisseurs[idx];

  // Nom
  const cellA = row.getCell(1);
  cellA.value = item ? item.nom : null;
  cellA.font = { name: 'Calibri', size: 11 };
  cellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  cellA.alignment = { vertical: 'middle', indent: 1 };
  cellA.border = thinBorder;

  // Catégorie
  const cellB = row.getCell(2);
  cellB.value = item ? item.categorie : null;
  cellB.font = { name: 'Calibri', size: 11 };
  cellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  cellB.alignment = { vertical: 'middle', indent: 1 };
  cellB.border = thinBorder;
  cellB.dataValidation = {
    type: 'list',
    allowBlank: true,
    formulae: [`"${categoryDropdown}"`],
    showDropDown: false,
  };

  // Téléphone
  const cellC = row.getCell(3);
  cellC.value = item ? item.telephone : null;
  cellC.font = { name: 'Calibri', size: 11 };
  cellC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  cellC.alignment = { horizontal: 'center', vertical: 'middle' };
  cellC.border = thinBorder;

  // Payé
  const cellD = row.getCell(4);
  cellD.font = { name: 'Calibri', size: 11 };
  cellD.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  cellD.alignment = { horizontal: 'center', vertical: 'middle' };
  cellD.border = thinBorder;
  cellD.numFmt = '#,##0.00';

  // Crédit
  const cellE = row.getCell(5);
  cellE.font = { name: 'Calibri', size: 11 };
  cellE.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  cellE.alignment = { horizontal: 'center', vertical: 'middle' };
  cellE.border = thinBorder;
  cellE.numFmt = '#,##0.00';

  row.height = 22;
}

const lastFRow = totalFRows + 2;
wsF.views = [{ state: 'frozen', ySplit: 2, activeCell: 'A3' }];
wsF.autoFilter = { from: 'A2', to: `E${lastFRow}` };
wsF.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1 };

console.log(`✅ Fournisseurs: ${fournisseurs.length} fournisseurs + Payé & Crédit columns`);

await outWb.xlsx.writeFile(outputFile);
console.log(`\n✅ ${outputFile}`);
