import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '..', 'excel-categories');
const fournisseurFile = path.join(dir, 'Fournisseurs.xlsx');
const inventaireFile = path.join(dir, 'Inventaire_Complet.xlsx');

const style = { header: '37474F', headerFont: 'FFFFFF', light: 'ECEFF1', medium: 'CFD8DC' };

const thinBorder = {
  top:    { style: 'thin', color: { argb: 'CCCCCC' } },
  left:   { style: 'thin', color: { argb: 'CCCCCC' } },
  bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
  right:  { style: 'thin', color: { argb: 'CCCCCC' } },
};

const categoryNames = [
  'Légumes', 'Économat', 'Fromage', 'Poisson', 'Viande', 'Économat Pdt Italien',
];

// Step 1: Read fournisseur data, filter empty rows, fix phone numbers
const srcWb = new ExcelJS.Workbook();
await srcWb.xlsx.readFile(fournisseurFile);
const srcWs = srcWb.worksheets[0];

const fournisseurs = [];
srcWs.eachRow((row, rowNumber) => {
  if (rowNumber < 3) return;
  const nom = row.getCell(1).value;
  const categorie = row.getCell(2).value;
  const telephone = row.getCell(3).value;

  // Skip empty rows
  if (!nom && !categorie && !telephone) return;
  if (typeof nom === 'string' && nom.trim() === '' && !categorie && !telephone) return;

  // Fix phone: add +212 prefix
  let phone = telephone != null ? String(telephone).trim() : '';
  if (phone && !phone.startsWith('+212')) {
    // Remove leading 0 if present
    phone = phone.replace(/^0/, '');
    phone = '+212' + phone;
  }

  fournisseurs.push({
    nom: nom ? String(nom).trim() : '',
    categorie: categorie ? String(categorie).trim() : '',
    telephone: phone,
  });
});

console.log(`📖 Read ${fournisseurs.length} fournisseurs (empty rows removed)`);
fournisseurs.forEach(f => console.log(`   ${f.nom} | ${f.categorie} | ${f.telephone}`));

// Helper to style a fournisseur sheet
function buildFournisseurSheet(ws, data) {
  ws.columns = [
    { key: 'nom',       width: 30 },
    { key: 'categorie', width: 24 },
    { key: 'telephone', width: 22 },
  ];

  // ROW 1 – Title
  ws.mergeCells('A1:C1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'FOURNISSEURS';
  titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: style.headerFont } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.header } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = thinBorder;
  ws.getRow(1).height = 40;

  // ROW 2 – Headers
  const headerRow = ws.getRow(2);
  ['Nom Complet', 'Catégorie', 'Numéro de Téléphone'].forEach((h, i) => {
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

  // Data rows + extra empty rows
  const totalRows = Math.max(data.length + 10, 30);
  const categoryDropdown = categoryNames.join(',');

  for (let idx = 0; idx < totalRows; idx++) {
    const rowNum = idx + 3;
    const row = ws.getRow(rowNum);
    const bgColor = idx % 2 === 0 ? style.light : style.medium;
    const item = data[idx];

    const cellA = row.getCell(1);
    cellA.value = item ? item.nom : null;
    cellA.font = { name: 'Calibri', size: 11 };
    cellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cellA.alignment = { vertical: 'middle', indent: 1 };
    cellA.border = thinBorder;

    const cellB = row.getCell(2);
    cellB.value = item ? item.categorie : null;
    cellB.font = { name: 'Calibri', size: 11 };
    cellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cellB.alignment = { vertical: 'middle', indent: 1 };
    cellB.border = thinBorder;

    const cellC = row.getCell(3);
    cellC.value = item ? item.telephone : null;
    cellC.font = { name: 'Calibri', size: 11 };
    cellC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cellC.alignment = { horizontal: 'center', vertical: 'middle' };
    cellC.border = thinBorder;

    row.height = 22;

    ws.getCell(`B${rowNum}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${categoryDropdown}"`],
      showDropDown: false,
      prompt: 'Choisir une catégorie',
      promptTitle: 'Catégorie',
    };
  }

  const lastRow = totalRows + 2;
  ws.views = [{ state: 'frozen', ySplit: 2, activeCell: 'A3' }];
  ws.autoFilter = { from: 'A2', to: `C${lastRow}` };
  ws.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1 };
}

// Step 2: Rewrite Fournisseurs.xlsx (clean, no empty rows, +212)
const newFournWb = new ExcelJS.Workbook();
newFournWb.creator = 'Epictète Restaurant';
const newFournWs = newFournWb.addWorksheet('Fournisseurs');
buildFournisseurSheet(newFournWs, fournisseurs);
await newFournWb.xlsx.writeFile(fournisseurFile);
console.log(`\n✅ Fournisseurs.xlsx updated (cleaned + +212 prefixed)`);

// Step 3: Update Inventaire_Complet.xlsx — replace Fournisseur sheet
const invWb = new ExcelJS.Workbook();
await invWb.xlsx.readFile(inventaireFile);

// Remove existing Fournisseur sheet if present
const existingSheet = invWb.getWorksheet('Fournisseur') || invWb.getWorksheet('Fournisseurs');
if (existingSheet) {
  invWb.removeWorksheet(existingSheet.id);
}

const invFournWs = invWb.addWorksheet('Fournisseurs');
buildFournisseurSheet(invFournWs, fournisseurs);
await invWb.xlsx.writeFile(inventaireFile);
console.log(`✅ Inventaire_Complet.xlsx updated (Fournisseurs sheet synced)`);
