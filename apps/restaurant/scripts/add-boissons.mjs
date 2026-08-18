import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '..', 'excel-categories');

const boissons = [
  "Sidi Ali 75cl",
  "Oulmès 75cl",
  "Sidi Ali 50cl",
  "Oulmès 33cl",
  "Coca Cola",
  "Coca Cola Zéro",
  "Sprite",
  "Schweppes Tonic",
  "Schweppes Citron",
  "Hawaï",
  "Orangina",
  "San Miguel",
  "Café",
];

const catStyle = { header: '00897B', headerFont: 'FFFFFF', light: 'E0F2F1', medium: 'B2DFDB' };

const thinBorder = {
  top:    { style: 'thin', color: { argb: 'CCCCCC' } },
  left:   { style: 'thin', color: { argb: 'CCCCCC' } },
  bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
  right:  { style: 'thin', color: { argb: 'CCCCCC' } },
};

const unitOptions = [
  'Kg','g','L','cl','ml','Pièce','Botte','Barquette',
  'Boîte','Sachet','Paquet','Bouteille','Pot','Rouleau',
  'Carton','Plateau','Filet','Douzaine','Casier',
];

const allCategories = [
  'Légumes','Économat','Fromage','Poisson','Viande','Économat Pdt Italien','Boissons',
];

function buildCategorySheet(ws, products, style, hasQuantite) {
  const colCount = hasQuantite ? 4 : 3;
  const lastCol = hasQuantite ? 'D' : 'C';

  if (hasQuantite) {
    ws.columns = [
      { key: 'produit',  width: 30 },
      { key: 'prix',     width: 14 },
      { key: 'quantite', width: 14 },
      { key: 'unite',    width: 16 },
    ];
  } else {
    ws.columns = [
      { key: 'produit', width: 30 },
      { key: 'prix',    width: 14 },
      { key: 'unite',   width: 16 },
    ];
  }

  // ROW 1 – Title
  ws.mergeCells(`A1:${lastCol}1`);
  const titleCell = ws.getCell('A1');
  titleCell.value = 'BOISSONS';
  titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: style.headerFont } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.header } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = thinBorder;
  ws.getRow(1).height = 40;

  // ROW 2 – Headers
  const headerRow = ws.getRow(2);
  const headers = hasQuantite
    ? ['Produit', 'Prix (MAD)', 'Quantité', 'Unité']
    : ['Produit', 'Prix (MAD)', 'Unité'];
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.header } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top:    { style: 'medium', color: { argb: style.header } },
      left:   { style: 'thin',   color: { argb: '999999' } },
      bottom: { style: 'medium', color: { argb: style.header } },
      right:  { style: 'thin',   color: { argb: '999999' } },
    };
  });
  headerRow.height = 28;

  // DATA ROWS
  products.forEach((product, idx) => {
    const rowNum = idx + 3;
    const row = ws.getRow(rowNum);
    const bgColor = idx % 2 === 0 ? style.light : style.medium;

    // Produit
    const cellA = row.getCell(1);
    cellA.value = product;
    cellA.font = { name: 'Calibri', size: 11 };
    cellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cellA.alignment = { vertical: 'middle', indent: 1 };
    cellA.border = thinBorder;

    // Prix
    const cellB = row.getCell(2);
    cellB.font = { name: 'Calibri', size: 11 };
    cellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cellB.alignment = { horizontal: 'center', vertical: 'middle' };
    cellB.border = thinBorder;
    cellB.numFmt = '#,##0.00';

    if (hasQuantite) {
      // Quantité
      const cellC = row.getCell(3);
      cellC.font = { name: 'Calibri', size: 11 };
      cellC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cellC.alignment = { horizontal: 'center', vertical: 'middle' };
      cellC.border = thinBorder;
      cellC.numFmt = '#,##0.00';

      // Unité
      const cellD = row.getCell(4);
      cellD.value = 'Casier';
      cellD.font = { name: 'Calibri', size: 11 };
      cellD.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cellD.alignment = { horizontal: 'center', vertical: 'middle' };
      cellD.border = thinBorder;
      cellD.dataValidation = {
        type: 'list', allowBlank: true,
        formulae: [`"${unitOptions.join(',')}"`],
        showDropDown: false,
      };
    } else {
      // Unité
      const cellC = row.getCell(3);
      cellC.value = 'Casier';
      cellC.font = { name: 'Calibri', size: 11 };
      cellC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cellC.alignment = { horizontal: 'center', vertical: 'middle' };
      cellC.border = thinBorder;
      cellC.dataValidation = {
        type: 'list', allowBlank: true,
        formulae: [`"${unitOptions.join(',')}"`],
        showDropDown: false,
      };
    }

    row.height = 22;
  });

  const lastRow = products.length + 2;
  ws.views = [{ state: 'frozen', ySplit: 2, activeCell: 'A3' }];
  ws.autoFilter = { from: 'A2', to: `${lastCol}${lastRow}` };
  ws.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1 };
}

// ============================================================
// 1. Create standalone Boissons.xlsx
// ============================================================
const boissonWb = new ExcelJS.Workbook();
boissonWb.creator = 'Epictète Restaurant';
const boissonWs = boissonWb.addWorksheet('Boissons');
buildCategorySheet(boissonWs, boissons, catStyle, false);
const boissonFile = path.join(dir, 'Boissons.xlsx');
await boissonWb.xlsx.writeFile(boissonFile);
console.log(`✅ Boissons.xlsx created (${boissons.length} produits)`);

// ============================================================
// 2. Add Boissons sheet to Inventaire_Complet.xlsx
// ============================================================
const invFile = path.join(dir, 'Inventaire_Complet.xlsx');
const invWb = new ExcelJS.Workbook();
await invWb.xlsx.readFile(invFile);
const existing1 = invWb.getWorksheet('Boissons');
if (existing1) invWb.removeWorksheet(existing1.id);
const invBoissonWs = invWb.addWorksheet('Boissons');
buildCategorySheet(invBoissonWs, boissons, catStyle, false);

// Update Fournisseur category dropdown to include Boissons
const invFournWs = invWb.getWorksheet('Fournisseurs');
if (invFournWs) {
  invFournWs.eachRow((row, num) => {
    if (num < 3) return;
    // Column A has category dropdown in Inventaire (old format: B)
    // Check which column has the dropdown
    const cellA = row.getCell(1);
    const cellB = row.getCell(2);
    // Update whichever has the category dropdown
    for (const cell of [cellA, cellB]) {
      if (cell.dataValidation && cell.dataValidation.type === 'list') {
        cell.dataValidation.formulae = [`"${allCategories.join(',')}"`];
      }
    }
  });
}
await invWb.xlsx.writeFile(invFile);
console.log(`✅ Inventaire_Complet.xlsx updated (Boissons sheet + category dropdown)`);

// ============================================================
// 3. Add Boissons sheet to Suivi_Inventaire.xlsx
// ============================================================
const suiviFile = path.join(dir, 'Suivi_Inventaire.xlsx');
const suiviWb = new ExcelJS.Workbook();
await suiviWb.xlsx.readFile(suiviFile);
const existing2 = suiviWb.getWorksheet('Boissons');
if (existing2) suiviWb.removeWorksheet(existing2.id);
const suiviBoissonWs = suiviWb.addWorksheet('Boissons');
buildCategorySheet(suiviBoissonWs, boissons, catStyle, true);

// Update Fournisseur category dropdown
const suiviFournWs = suiviWb.getWorksheet('Fournisseurs');
if (suiviFournWs) {
  suiviFournWs.eachRow((row, num) => {
    if (num < 3) return;
    const cellA = row.getCell(1);
    if (cellA.dataValidation && cellA.dataValidation.type === 'list') {
      cellA.dataValidation.formulae = [`"${allCategories.join(',')}"`];
    }
  });
}
await suiviWb.xlsx.writeFile(suiviFile);
console.log(`✅ Suivi_Inventaire.xlsx updated (Boissons sheet + category dropdown)`);

console.log('\nDone!');
