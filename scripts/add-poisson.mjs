import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '..', 'excel-categories');

const newProducts = ['Espadon', 'Saint-Pierre'];

const style = { header: '2196F3', headerFont: 'FFFFFF', light: 'E3F2FD', medium: 'BBDEFB' };
const thinBorder = {
  top:    { style: 'thin', color: { argb: 'CCCCCC' } },
  left:   { style: 'thin', color: { argb: 'CCCCCC' } },
  bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
  right:  { style: 'thin', color: { argb: 'CCCCCC' } },
};
const unitOptions = [
  'Kg','g','L','cl','ml','Pièce','Botte','Barquette',
  'Boîte','Sachet','Paquet','Bouteille','Pot','Rouleau',
  'Carton','Plateau','Filet','Douzaine',
];

async function addToFile(filePath, sheetName) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.getWorksheet(sheetName);

  // Find last data row
  let lastRow = 2;
  ws.eachRow((row, num) => { if (num > lastRow) lastRow = num; });

  // Add new products
  for (const product of newProducts) {
    lastRow++;
    const idx = lastRow - 3;
    const row = ws.getRow(lastRow);
    const bgColor = idx % 2 === 0 ? style.light : style.medium;

    const cellA = row.getCell(1);
    cellA.value = product;
    cellA.font = { name: 'Calibri', size: 11 };
    cellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cellA.alignment = { vertical: 'middle', indent: 1 };
    cellA.border = thinBorder;

    const cellB = row.getCell(2);
    cellB.font = { name: 'Calibri', size: 11 };
    cellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cellB.alignment = { horizontal: 'center', vertical: 'middle' };
    cellB.border = thinBorder;
    cellB.numFmt = '#,##0.00';

    const cellC = row.getCell(3);
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

    row.height = 22;
  }

  ws.autoFilter = { from: 'A2', to: `C${lastRow}` };
  await wb.xlsx.writeFile(filePath);
  console.log(`✅ ${path.basename(filePath)} — added Espadon & Saint-Pierre (${lastRow - 2} produits total)`);
}

await addToFile(path.join(dir, 'Poisson.xlsx'), 'Poisson');
await addToFile(path.join(dir, 'Inventaire_Complet.xlsx'), 'Poisson');
