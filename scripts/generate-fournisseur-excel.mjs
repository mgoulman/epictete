import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputFile = path.join(__dirname, '..', 'excel-categories', 'Fournisseurs.xlsx');

const categoryNames = [
  'Légumes',
  'Économat',
  'Fromage',
  'Poisson',
  'Viande',
  'Économat Pdt Italien',
];

const style = { header: '37474F', headerFont: 'FFFFFF', light: 'ECEFF1', medium: 'CFD8DC' };

const thinBorder = {
  top:    { style: 'thin', color: { argb: 'CCCCCC' } },
  left:   { style: 'thin', color: { argb: 'CCCCCC' } },
  bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
  right:  { style: 'thin', color: { argb: 'CCCCCC' } },
};

const wb = new ExcelJS.Workbook();
wb.creator = 'Epictète Restaurant';
const ws = wb.addWorksheet('Fournisseurs');

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
const headers = ['Nom Complet', 'Catégorie', 'Numéro de Téléphone'];
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

// 30 empty styled rows with category dropdown
const categoryDropdown = categoryNames.join(',');
for (let idx = 0; idx < 30; idx++) {
  const rowNum = idx + 3;
  const row = ws.getRow(rowNum);
  const bgColor = idx % 2 === 0 ? style.light : style.medium;

  for (let col = 1; col <= 3; col++) {
    const cell = row.getCell(col);
    cell.font = { name: 'Calibri', size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.alignment = { vertical: 'middle', horizontal: col === 3 ? 'center' : 'left', indent: col === 3 ? 0 : 1 };
    cell.border = thinBorder;
  }
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

ws.views = [{ state: 'frozen', ySplit: 2, activeCell: 'A3' }];
ws.autoFilter = { from: 'A2', to: 'C32' };
ws.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1 };

await wb.xlsx.writeFile(outputFile);
console.log(`✅ ${outputFile}`);
