import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, '..', 'excel-categories');
fs.mkdirSync(outputDir, { recursive: true });

// --- Category colors (header bg + alternating row tint) ---
const categoryStyles = {
  "Légumes":       { header: '4CAF50', headerFont: 'FFFFFF', light: 'E8F5E9', medium: 'C8E6C9' },
  "Économat":      { header: 'FF9800', headerFont: 'FFFFFF', light: 'FFF3E0', medium: 'FFE0B2' },
  "Fromage":       { header: 'FFC107', headerFont: '333333', light: 'FFFDE7', medium: 'FFF9C4' },
  "Poisson":       { header: '2196F3', headerFont: 'FFFFFF', light: 'E3F2FD', medium: 'BBDEFB' },
  "Viande":        { header: 'F44336', headerFont: 'FFFFFF', light: 'FFEBEE', medium: 'FFCDD2' },
  "Pâtes & Autres":{ header: '9C27B0', headerFont: 'FFFFFF', light: 'F3E5F5', medium: 'E1BEE7' },
};

// --- Unit dropdown options ---
const unitOptions = [
  'Kg',
  'g',
  'L',
  'cl',
  'ml',
  'Pièce',
  'Botte',
  'Barquette',
  'Boîte',
  'Sachet',
  'Paquet',
  'Bouteille',
  'Pot',
  'Rouleau',
  'Carton',
  'Plateau',
  'Filet',
  'Douzaine',
];

const categories = {
  "Légumes": [
    "Tomate", "Tomate cerise", "Tomate cerise jaune", "Germe", "Haricots verts",
    "Brocolis", "Petit pois", "Choux Bruxelles", "Asperges", "Pomme de terre",
    "Pomme nouvelle", "Ail", "Oignons rouges", "Carotte", "Bébé carottes",
    "Courgettes", "Aubergine", "Poivrons rouge", "Poivrons jaunes", "Concombre",
    "Persil", "Roquette", "Salade ice berg", "Salade lola rosa", "Salade romaine",
    "Basilic", "Thym", "Romarin", "Ciboulette", "Champignons",
    "Olive noire", "Menthe", "Pamplemousse", "Avocat", "Kiwi",
    "Mangue", "Fraise", "Framboise", "Fruits rouges", "Pommes",
    "Banane", "Orange", "Poire", "Gingembre frais", "Épinard",
    "Betterave", "Poireaux", "Citron",
  ],
  "Économat": [
    "Huile de table", "Huile friteuse", "Pâtes", "Rigatoni", "Spaghetti",
    "Linguini", "Tagliatelle", "Cannelloni", "Pouches", "Les gants",
    "Œufs", "Origan", "Film alimentaire", "Finot", "Farine",
    "Poudre cacao", "Chapelure", "Thé", "Sucre thé", "Sucre semoule",
    "Vinaigre blanc", "Œufs (caille)", "Anchoix mariné", "Anchoix salé", "Biscuits tiramissu",
    "Farine capoto", "Farine pizza kenz", "Charlotte", "Sel de table", "Thon",
    "Maïs", "Câpre", "Poivre vert", "Tomate pelée", "Artichaut",
    "Sac congélation", "Moutarde", "Ketchup", "Gélatine", "Sucre vanille",
    "Levure chimique", "Arôme vanille", "Sucre glace", "Crème pâtissière", "Sucre cassonade",
    "Maizina", "Amlou", "Agrich", "Nutella", "Demi glace",
    "Crème balsamic", "Tabasco", "Levure rafiaa", "Soya sauce", "Vinaigre de vin blanc",
    "Vinaigre de vin rouge", "Vinaigre balsamic", "Risotto arborio", "Nescafé", "Tomate aicha",
    "Chocolat noir 55%", "Quinoa noir", "Lentille", "Haricot blanc", "Poivre poudre",
    "Gingembre", "Noix de muscade", "Curcuma", "Figue", "Biscuit sablé",
    "Lait UHT", "Knor", "Truff", "Tomate séchée", "Crème cuisson",
    "Crème cheese", "Moutarde à l'ancienne",
  ],
  "Fromage": [
    "Burrata", "Ricotta", "Scarmosa", "Mozza salade", "Mozzarella",
  ],
  "Poisson": [
    "Calamars", "Moule décortiquée", "Moule avec coquille", "Chair de crabe", "Palourde",
    "Saumon frais", "Saumon fumé", "Poulpe", "Gambas 30/50",
  ],
  "Viande": [
    "Blanc de poulet", "Filet de boeuf", "Entrecôte", "Carpaccio",
  ],
  "Pâtes & Autres": [
    "Parmesan", "Gorgonzola", "Mascarpone", "Brésaola", "Tomate pizza",
    "Riz arborio", "Spaghetti", "Linguini", "Penne", "Rigatoni", "Farine KENZ",
  ],
};

const thinBorder = {
  top:    { style: 'thin', color: { argb: 'CCCCCC' } },
  left:   { style: 'thin', color: { argb: 'CCCCCC' } },
  bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
  right:  { style: 'thin', color: { argb: 'CCCCCC' } },
};

async function generateFile(category, products) {
  const style = categoryStyles[category];
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Epictète Restaurant';
  const ws = wb.addWorksheet(category.substring(0, 31));

  // Column widths
  ws.columns = [
    { key: 'produit',     width: 30 },
    { key: 'prix',        width: 14 },
    { key: 'unite',       width: 16 },
  ];

  // =====================
  // ROW 1 – Category title (merged across 4 columns)
  // =====================
  ws.mergeCells('A1:C1');
  const titleCell = ws.getCell('A1');
  titleCell.value = category.toUpperCase();
  titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: style.headerFont } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.header } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = thinBorder;
  ws.getRow(1).height = 40;

  // =====================
  // ROW 2 – Column headers
  // =====================
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

  // =====================
  // DATA ROWS (starting row 3)
  // =====================
  products.forEach((product, idx) => {
    const rowNum = idx + 3;
    const row = ws.getRow(rowNum);
    const isEven = idx % 2 === 0;
    const bgColor = isEven ? style.light : style.medium;

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

    // Unité
    const cellC = row.getCell(3);
    cellC.font = { name: 'Calibri', size: 11 };
    cellC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cellC.alignment = { horizontal: 'center', vertical: 'middle' };
    cellC.border = thinBorder;

    row.height = 22;
  });

  // =====================
  // Dropdown validation on Unité column (C3:C...)
  // =====================
  const lastDataRow = products.length + 2;
  for (let r = 3; r <= lastDataRow; r++) {
    ws.getCell(`C${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${unitOptions.join(',')}"`],
      showDropDown: false,   // false = show the dropdown arrow in Excel
      prompt: 'Choisir une unité',
      promptTitle: 'Unité',
    };
  }

  // =====================
  // Freeze header rows
  // =====================
  ws.views = [{ state: 'frozen', ySplit: 2, activeCell: 'A3' }];

  // =====================
  // Auto-filter on header row
  // =====================
  ws.autoFilter = { from: 'A2', to: `C${lastDataRow}` };

  // =====================
  // Print settings
  // =====================
  ws.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1 };

  // Save
  const safeName = category.replace(/[^\w\sàâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ&]/g, '').replace(/\s+/g, '_');
  const filePath = path.join(outputDir, `${safeName}.xlsx`);
  await wb.xlsx.writeFile(filePath);
  console.log(`✅ ${filePath} (${products.length} produits)`);
}

// Generate all files
(async () => {
  for (const [category, products] of Object.entries(categories)) {
    await generateFile(category, products);
  }
  console.log('\nDone! All styled Excel files created in excel-categories/');
})();
