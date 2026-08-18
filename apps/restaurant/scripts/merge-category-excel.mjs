import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputDir = path.join(__dirname, '..', 'excel-categories');
const outputFile = path.join(__dirname, '..', 'excel-categories', 'Inventaire_Complet.xlsx');

// --- Category styles ---
const categoryStyles = {
  "Légumes":        { header: '4CAF50', headerFont: 'FFFFFF', light: 'E8F5E9', medium: 'C8E6C9' },
  "Économat":       { header: 'FF9800', headerFont: 'FFFFFF', light: 'FFF3E0', medium: 'FFE0B2' },
  "Fromage":        { header: 'FFC107', headerFont: '333333', light: 'FFFDE7', medium: 'FFF9C4' },
  "Poisson":        { header: '2196F3', headerFont: 'FFFFFF', light: 'E3F2FD', medium: 'BBDEFB' },
  "Viande":         { header: 'F44336', headerFont: 'FFFFFF', light: 'FFEBEE', medium: 'FFCDD2' },
  "Économat Pdt Italien": { header: '9C27B0', headerFont: 'FFFFFF', light: 'F3E5F5', medium: 'E1BEE7' },
};

const unitOptions = [
  'Kg', 'g', 'L', 'cl', 'ml', 'Pièce', 'Botte', 'Barquette',
  'Boîte', 'Sachet', 'Paquet', 'Bouteille', 'Pot', 'Rouleau',
  'Carton', 'Plateau', 'Filet', 'Douzaine',
];

const thinBorder = {
  top:    { style: 'thin', color: { argb: 'CCCCCC' } },
  left:   { style: 'thin', color: { argb: 'CCCCCC' } },
  bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
  right:  { style: 'thin', color: { argb: 'CCCCCC' } },
};

// Map filenames back to category names
const fileToCategory = {
  'Légumes.xlsx':        'Légumes',
  'Économat.xlsx':       'Économat',
  'Fromage.xlsx':        'Fromage',
  'Poisson.xlsx':        'Poisson',
  'Viande.xlsx':         'Viande',
  'Économat Pdt Italien.xlsx': 'Économat Pdt Italien',
};

async function readExistingFile(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.worksheets[0];
  const rows = [];

  // Data starts at row 3 (row 1 = title, row 2 = headers)
  ws.eachRow((row, rowNumber) => {
    if (rowNumber < 3) return;
    rows.push({
      produit: row.getCell(1).value || '',
      prix:    row.getCell(2).value,
      unite:   row.getCell(3).value || '',
    });
  });

  return rows;
}

async function main() {
  const outputWb = new ExcelJS.Workbook();
  outputWb.creator = 'Epictète Restaurant';

  const categoryNames = [];

  // Process each category file
  for (const [filename, category] of Object.entries(fileToCategory)) {
    const filePath = path.join(inputDir, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${filename} not found, skipping`);
      continue;
    }

    categoryNames.push(category);
    const style = categoryStyles[category];
    const products = await readExistingFile(filePath);
    console.log(`📖 Read ${filename}: ${products.length} produits`);

    const ws = outputWb.addWorksheet(category.substring(0, 31));

    // Column widths
    ws.columns = [
      { key: 'produit', width: 30 },
      { key: 'prix',    width: 14 },
      { key: 'unite',   width: 16 },
    ];

    // ROW 1 – Category title
    ws.mergeCells('A1:C1');
    const titleCell = ws.getCell('A1');
    titleCell.value = category.toUpperCase();
    titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: style.headerFont } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.header } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = thinBorder;
    ws.getRow(1).height = 40;

    // ROW 2 – Column headers
    const headerRow = ws.getRow(2);
    const headers = ['Produit', 'Prix (MAD)', 'Unité'];
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
    products.forEach((item, idx) => {
      const rowNum = idx + 3;
      const row = ws.getRow(rowNum);
      const isEven = idx % 2 === 0;
      const bgColor = isEven ? style.light : style.medium;

      // Produit
      const cellA = row.getCell(1);
      cellA.value = item.produit;
      cellA.font = { name: 'Calibri', size: 11 };
      cellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cellA.alignment = { vertical: 'middle', indent: 1 };
      cellA.border = thinBorder;

      // Prix (preserve existing value)
      const cellB = row.getCell(2);
      cellB.value = item.prix != null && item.prix !== '' ? item.prix : null;
      cellB.font = { name: 'Calibri', size: 11 };
      cellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cellB.alignment = { horizontal: 'center', vertical: 'middle' };
      cellB.border = thinBorder;
      cellB.numFmt = '#,##0.00';

      // Unité (preserve existing value)
      const cellC = row.getCell(3);
      cellC.value = item.unite || null;
      cellC.font = { name: 'Calibri', size: 11 };
      cellC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cellC.alignment = { horizontal: 'center', vertical: 'middle' };
      cellC.border = thinBorder;

      row.height = 22;
    });

    // Dropdown on Unité column
    const lastDataRow = products.length + 2;
    for (let r = 3; r <= lastDataRow; r++) {
      ws.getCell(`C${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${unitOptions.join(',')}"`],
        showDropDown: false,
        prompt: 'Choisir une unité',
        promptTitle: 'Unité',
      };
    }

    // Freeze & filter
    ws.views = [{ state: 'frozen', ySplit: 2, activeCell: 'A3' }];
    ws.autoFilter = { from: 'A2', to: `C${lastDataRow}` };
    ws.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1 };
  }

  // =====================
  // NEW SHEET: Fournisseur
  // =====================
  const fournisseurStyle = { header: '37474F', headerFont: 'FFFFFF', light: 'ECEFF1', medium: 'CFD8DC' };
  const wsF = outputWb.addWorksheet('Fournisseur');

  wsF.columns = [
    { key: 'nom',       width: 30 },
    { key: 'categorie', width: 22 },
    { key: 'telephone', width: 22 },
  ];

  // ROW 1 – Title
  wsF.mergeCells('A1:C1');
  const fTitleCell = wsF.getCell('A1');
  fTitleCell.value = 'FOURNISSEURS';
  fTitleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: fournisseurStyle.headerFont } };
  fTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fournisseurStyle.header } };
  fTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  fTitleCell.border = thinBorder;
  wsF.getRow(1).height = 40;

  // ROW 2 – Headers
  const fHeaderRow = wsF.getRow(2);
  const fHeaders = ['Nom Complet', 'Catégorie', 'Numéro de Téléphone'];
  fHeaders.forEach((h, i) => {
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

  // Pre-fill 30 empty rows with styling + dropdown
  const categoryDropdown = categoryNames.join(',');
  for (let idx = 0; idx < 30; idx++) {
    const rowNum = idx + 3;
    const row = wsF.getRow(rowNum);
    const isEven = idx % 2 === 0;
    const bgColor = isEven ? fournisseurStyle.light : fournisseurStyle.medium;

    for (let col = 1; col <= 3; col++) {
      const cell = row.getCell(col);
      cell.font = { name: 'Calibri', size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.alignment = { vertical: 'middle', horizontal: col === 3 ? 'center' : 'left', indent: col === 3 ? 0 : 1 };
      cell.border = thinBorder;
    }
    row.height = 22;

    // Catégorie dropdown
    wsF.getCell(`B${rowNum}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${categoryDropdown}"`],
      showDropDown: false,
      prompt: 'Choisir une catégorie',
      promptTitle: 'Catégorie',
    };
  }

  // Freeze & filter
  wsF.views = [{ state: 'frozen', ySplit: 2, activeCell: 'A3' }];
  wsF.autoFilter = { from: 'A2', to: 'C32' };
  wsF.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1 };

  // Save
  await outputWb.xlsx.writeFile(outputFile);
  console.log(`\n✅ ${outputFile}`);
  console.log(`   ${categoryNames.length} onglets catégorie + 1 onglet Fournisseur`);
}

main().catch(console.error);
