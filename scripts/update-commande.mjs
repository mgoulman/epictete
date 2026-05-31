import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '..', 'excel-categories');
const commandeFile = path.join(dir, 'Commande.xlsx');
const inventaireFile = path.join(dir, 'Inventaire_Complet.xlsx');

// ============================================================
// MAPPING: existing products → set quantity
// ============================================================
const existingUpdates = {
  "Économat": {
    "Cannelloni": 1,
    "Thon": 2,
    "Arôme vanille": 10,
    "Levure chimique": 3,
    "Lentille": 3,
    "Poudre cacao": 5,
    "Lait UHT": 22,
    "Farine": 1,
    "Finot": 1,
    "Huile de table": 3,
    "Soya sauce": 2,
    "Câpre": 1,
    "Vinaigre de vin rouge": 1,
    "Vinaigre blanc": 9,
    "Nescafé": 5,
    "Sel de table": 8,
    "Demi glace": 3,
    "Moutarde à l'ancienne": 1,
    "Sucre semoule": 4,
    "Moutarde": 2,
    "Ketchup": 2,
    "Tomate aicha": 1,
    "Maïs": 1,
    "Biscuits tiramissu": 2,
    "Chocolat noir 55%": 1,
    "Farine pizza kenz": 1,
    "Levure rafiaa": 29,
  },
  "Économat Pdt Italien": {
    "Linguini": 6,
    "Rigatoni": 1,
    "Spaghetti": 2,
    "Penne": 3,
    "Riz arborio": 5,
    "Farine KENZ": 1,
  },
};

// ============================================================
// NEW products to add
// ============================================================
const newProducts = {
  "Économat": [
    { produit: "Flocons d'avoine", qty: 1 },
    { produit: "Chapelure panko", qty: 4 },
    { produit: "Crème pâtissière citron", qty: 1 },
    { produit: "Passata de tomates", qty: 1 },
    { produit: "Chocolat pâtissier", qty: 1 },
    { produit: "Galettes de riz", qty: 1 },
    { produit: "Sablé coco", qty: 56 },
    { produit: "Bouillon de légumes", qty: 5 },
    { produit: "Lentilles corail", qty: 1 },
    { produit: "Pois chiches", qty: 1 },
    { produit: "Sucre fleur d'oranger", qty: 1 },
    { produit: "Préparation aromatique vanille", qty: 1 },
    { produit: "Vinaigre à l'estragon", qty: 1 },
    { produit: "Mélasse de grenadine", qty: 1 },
    { produit: "Eau de fleur d'oranger", qty: 1 },
    { produit: "Sauce barbecue", qty: 1 },
  ],
  "Économat Pdt Italien": [
    { produit: "Penne ziti rigate", qty: 7 },
    { produit: "Nouilles soba", qty: 1 },
    { produit: "Riz noir", qty: 1 },
    { produit: "Tartufata", qty: 3 },
    { produit: "Tartufo nero", qty: 2 },
  ],
};

// ============================================================
// Style configs
// ============================================================
const categoryStyles = {
  "Légumes":              { header: '4CAF50', headerFont: 'FFFFFF', light: 'E8F5E9', medium: 'C8E6C9' },
  "Économat":             { header: 'FF9800', headerFont: 'FFFFFF', light: 'FFF3E0', medium: 'FFE0B2' },
  "Fromage":              { header: 'FFC107', headerFont: '333333', light: 'FFFDE7', medium: 'FFF9C4' },
  "Poisson":              { header: '2196F3', headerFont: 'FFFFFF', light: 'E3F2FD', medium: 'BBDEFB' },
  "Viande":               { header: 'F44336', headerFont: 'FFFFFF', light: 'FFEBEE', medium: 'FFCDD2' },
  "Économat Pdt Italien": { header: '9C27B0', headerFont: 'FFFFFF', light: 'F3E5F5', medium: 'E1BEE7' },
};

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

function styleNewRow(ws, rowNum, idx, catStyle) {
  const row = ws.getRow(rowNum);
  const bgColor = idx % 2 === 0 ? catStyle.light : catStyle.medium;

  for (let col = 1; col <= 4; col++) {
    const cell = row.getCell(col);
    cell.font = { name: 'Calibri', size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.border = thinBorder;
    if (col === 1) {
      cell.alignment = { vertical: 'middle', indent: 1 };
    } else {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    if (col === 2 || col === 4) cell.numFmt = '#,##0.00';
  }

  // Unité dropdown
  ws.getCell(`C${rowNum}`).dataValidation = {
    type: 'list',
    allowBlank: true,
    formulae: [`"${unitOptions.join(',')}"`],
    showDropDown: false,
  };

  row.height = 22;
}

async function processFile(filePath, isCommande) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  for (const [sheetName, updates] of Object.entries(existingUpdates)) {
    const ws = wb.getWorksheet(sheetName);
    if (!ws) { console.log(`  ⚠️  Sheet "${sheetName}" not found in ${path.basename(filePath)}`); continue; }

    let updatedCount = 0;
    ws.eachRow((row, num) => {
      if (num < 3) return;
      const produit = row.getCell(1).value;
      if (!produit) return;
      const name = String(produit).trim();
      if (updates[name] !== undefined) {
        if (isCommande) {
          row.getCell(4).value = updates[name]; // Quantité column (col D) only in Commande
        }
        updatedCount++;
      }
    });
    console.log(`  ✏️  ${sheetName}: updated ${updatedCount} quantities`);
  }

  // Add new products
  for (const [sheetName, items] of Object.entries(newProducts)) {
    const ws = wb.getWorksheet(sheetName);
    if (!ws) { console.log(`  ⚠️  Sheet "${sheetName}" not found in ${path.basename(filePath)}`); continue; }
    const catStyle = categoryStyles[sheetName];

    // Find last row
    let lastRow = 2;
    ws.eachRow((row, num) => { if (num > lastRow) lastRow = num; });

    let addedCount = 0;
    for (const item of items) {
      // Check if already exists
      let exists = false;
      ws.eachRow((row, num) => {
        if (num < 3) return;
        const val = row.getCell(1).value;
        if (val && String(val).trim() === item.produit) exists = true;
      });
      if (exists) continue;

      lastRow++;
      const idx = lastRow - 3;
      styleNewRow(ws, lastRow, idx, catStyle);
      ws.getRow(lastRow).getCell(1).value = item.produit;
      if (isCommande) {
        ws.getRow(lastRow).getCell(4).value = item.qty;
      }
      addedCount++;
    }

    // Update autoFilter
    const colEnd = isCommande ? 'D' : 'C';
    ws.autoFilter = { from: 'A2', to: `${colEnd}${lastRow}` };
    console.log(`  ➕ ${sheetName}: added ${addedCount} new products`);
  }

  await wb.xlsx.writeFile(filePath);
  console.log(`  ✅ ${path.basename(filePath)} saved\n`);
}

// Process Commande (has Quantité column)
console.log('📦 Updating Commande.xlsx...');
await processFile(commandeFile, true);

// Process Inventaire (no Quantité column, just add new products)
console.log('📦 Updating Inventaire_Complet.xlsx...');
await processFile(inventaireFile, false);

console.log('Done!');
