import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '..', 'excel-categories');
const commandeFile = path.join(dir, 'Commande.xlsx');
const inventaireFile = path.join(dir, 'Inventaire_Complet.xlsx');

// ============================================================
// Units from the pasted list, mapped to dropdown values
// ============================================================
const unitUpdates = {
  "Économat": {
    "Cannelloni":                     "Paquet",
    "Thon":                           "Boîte",
    "Arôme vanille":                  "Sachet",
    "Levure chimique":                "Sachet",
    "Lentille":                       "Kg",
    "Poudre cacao":                   "Sachet",
    "Lait UHT":                       "L",
    "Farine":                         "Kg",
    "Finot":                          "Kg",
    "Huile de table":                 "L",
    "Soya sauce":                     "Bouteille",
    "Câpre":                          "Boîte",
    "Vinaigre de vin rouge":          "Bouteille",
    "Vinaigre blanc":                 "Bouteille",
    "Nescafé":                        "Boîte",
    "Sel de table":                   "Paquet",
    "Demi glace":                     "Boîte",
    "Moutarde à l'ancienne":          "Bouteille",
    "Sucre semoule":                  "Kg",
    "Moutarde":                       "Kg",
    "Ketchup":                        "Kg",
    "Tomate aicha":                   "Boîte",
    "Maïs":                           "Boîte",
    "Biscuits tiramissu":             "Carton",
    "Chocolat noir 55%":              "Kg",
    "Farine pizza kenz":              "Kg",
    "Levure rafiaa":                  "Pièce",
    // New items
    "Flocons d'avoine":               "Paquet",
    "Chapelure panko":                "Paquet",
    "Crème pâtissière citron":        "Paquet",
    "Passata de tomates":             "Boîte",
    "Chocolat pâtissier":             "Kg",
    "Galettes de riz":                "Paquet",
    "Sablé coco":                     "Pièce",
    "Bouillon de légumes":            "Boîte",
    "Lentilles corail":               "Kg",
    "Pois chiches":                   "Kg",
    "Sucre fleur d'oranger":          "Sachet",
    "Préparation aromatique vanille": "Kg",
    "Vinaigre à l'estragon":         "Bouteille",
    "Mélasse de grenadine":           "Bouteille",
    "Eau de fleur d'oranger":         "Bouteille",
    "Sauce barbecue":                 "Kg",
  },
  "Économat Pdt Italien": {
    "Linguini":           "Paquet",
    "Rigatoni":           "Paquet",
    "Spaghetti":          "Kg",
    "Penne":              "Kg",
    "Riz arborio":        "Kg",
    "Farine KENZ":        "Kg",
    // New items
    "Penne ziti rigate":  "Paquet",
    "Nouilles soba":      "Paquet",
    "Riz noir":           "Paquet",
    "Tartufata":          "Boîte",
    "Tartufo nero":       "Bouteille",
  },
};

async function updateUnits(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  for (const [sheetName, updates] of Object.entries(unitUpdates)) {
    const ws = wb.getWorksheet(sheetName);
    if (!ws) { console.log(`  ⚠️  Sheet "${sheetName}" not found`); continue; }

    let count = 0;
    ws.eachRow((row, num) => {
      if (num < 3) return;
      const produit = row.getCell(1).value;
      if (!produit) return;
      const name = String(produit).trim();
      if (updates[name] !== undefined) {
        row.getCell(3).value = updates[name]; // Column C = Unité
        count++;
      }
    });
    console.log(`  ✏️  ${sheetName}: set ${count} units`);
  }

  await wb.xlsx.writeFile(filePath);
  console.log(`  ✅ ${path.basename(filePath)} saved\n`);
}

console.log('📦 Updating Commande.xlsx...');
await updateUnits(commandeFile);

console.log('📦 Updating Inventaire_Complet.xlsx...');
await updateUnits(inventaireFile);

console.log('Done!');
