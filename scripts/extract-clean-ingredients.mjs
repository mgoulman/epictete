// Script to extract CLEAN unique ingredients from Excel files
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Items to exclude (metadata, recipe names, etc.)
const excludePatterns = [
  'nombre de portion', 'nombre de ration', 'nombre de revient',
  'prix de revient', 'prix revient', 'prix vente', 'prix vente ttc',
  'pâte 4 fromages', 'pâte allarabaitta', 'pâte bolognais', 'pâte funghi', 'pâte pesto',
  'salade césar', 'salade fraîcheur', 'salade grecque', 'salade stracciatella',
  'carpaccio brésaola', 'carpaccio de boeuf', 'vitello tonato',
  'fondant au chocolat', 'mousse au chocolat', 'panacotta', 'chesse check',
  'buratta crémeuse', 'oesto', 'rdis', 'sauce bolognaise',
  'bisque', 'bouillon', 'colis framboise', 'l\' eau'
];

// Files to process
const files = [
  { path: 'fiche technique entrée froide.xlsx', category: 'entrée froide' },
  { path: 'fiche technique pâte.xlsx', category: 'pâtes' },
  { path: 'fiche technique dessert.xlsx', category: 'dessert' }
];

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  let str = String(value).replace(',', '.').replace(/[^\d.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function shouldExclude(name) {
  const lower = name.toLowerCase();
  return excludePatterns.some(pattern => lower.includes(pattern));
}

function extractIngredients(data) {
  const ingredients = [];
  let inIngredients = false;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const cleanRow = row.map(cell => {
      if (cell === null || cell === undefined) return '';
      return String(cell).trim();
    });

    const firstCell = cleanRow[0]?.toLowerCase() || '';

    // Check for ingredient header
    if (firstCell === 'article') {
      inIngredients = true;
      continue;
    }

    // Check for end of ingredients section
    if (inIngredients && cleanRow[0] === '' && cleanRow[1] === '') {
      inIngredients = false;
      continue;
    }

    // Parse ingredient row
    if (inIngredients && cleanRow[0] && cleanRow[0] !== '') {
      const ingredientName = cleanRow[0];
      const unit = cleanRow[1] || 'kg';
      const quantity = parseNumber(cleanRow[2]);
      const unitCost = parseNumber(cleanRow[3]);

      // Skip excluded items and items with no valid unit
      if (!shouldExclude(ingredientName) &&
          !['kg', 'l', 'pc', 'g', 'ml'].includes(ingredientName.toLowerCase()) &&
          unitCost > 0) {
        ingredients.push({
          name: ingredientName,
          unit: unit.toLowerCase(),
          unit_cost: unitCost
        });
      }
    }
  }

  return ingredients;
}

// Main extraction
const allIngredients = new Map();

for (const file of files) {
  const filePath = join(projectRoot, file.path);
  console.log(`Processing: ${file.path}`);

  try {
    const buffer = readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const ingredients = extractIngredients(data);

      for (const ing of ingredients) {
        const key = ing.name.toLowerCase();
        if (!allIngredients.has(key)) {
          allIngredients.set(key, {
            name: ing.name,
            unit: ing.unit,
            cost_per_unit: ing.unit_cost,
            count: 1
          });
        } else {
          const existing = allIngredients.get(key);
          existing.count++;
          if (ing.unit_cost > existing.cost_per_unit) {
            existing.cost_per_unit = ing.unit_cost;
          }
        }
      }
    }
  } catch (err) {
    console.error(`  Error: ${err.message}`);
  }
}

// Sort and display results
const sortedIngredients = Array.from(allIngredients.values())
  .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

console.log('\n========================================');
console.log('CLEAN INVENTORY ITEMS TO IMPORT');
console.log('========================================\n');

// Categorize ingredients
const categories = {
  'Légumes': ['ail', 'aubergine', 'avocat', 'carotte', 'concombre', 'courgette', 'champignon', 'oignon', 'poivron', 'tomate', 'radis', 'mais'],
  'Fruits': ['citron', 'mangue'],
  'Viandes': ['poulet', 'boeuf', 'viande', 'dind', 'jambon'],
  'Poissons & Fruits de mer': ['gambas', 'moule', 'palourdes', 'calamars', 'thon', 'anchois'],
  'Produits laitiers': ['beurre', 'crème', 'lait', 'mascarpone', 'parmesan', 'ricotta', 'fêta', 'emmental', 'bleu', 'philadelphia', 'mozzarella', 'mozza', 'buratta', 'stracciatella'],
  'Herbes & Épices': ['basilic', 'romarin', 'herbe', 'poivre', 'sel', 'piment'],
  'Pâtes & Féculents': ['pâte', 'farine'],
  'Huiles & Sauces': ['huile', 'sauce', 'mayonnaise', 'vinaigre'],
  'Autres': []
};

function getCategory(name) {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => lower.includes(kw))) return cat;
  }
  return 'Autres';
}

// Group by category
const byCategory = {};
for (const ing of sortedIngredients) {
  const cat = getCategory(ing.name);
  if (!byCategory[cat]) byCategory[cat] = [];
  byCategory[cat].push(ing);
}

let totalCount = 0;
for (const [cat, items] of Object.entries(byCategory).sort()) {
  if (items.length === 0) continue;
  console.log(`\n📦 ${cat} (${items.length} items)`);
  console.log('-'.repeat(60));
  for (const ing of items) {
    console.log(`  ${ing.name.padEnd(28)} | ${ing.unit.padEnd(4)} | ${ing.cost_per_unit.toFixed(2).padStart(8)} DH`);
    totalCount++;
  }
}

console.log('\n========================================');
console.log(`TOTAL: ${totalCount} ingredients to import to inventory`);
console.log('========================================\n');

// Output as SQL for direct import
console.log('\n-- SQL INSERT statements for inventory_items:');
console.log('-- Run these in Supabase SQL Editor\n');

for (const ing of sortedIngredients) {
  const cat = getCategory(ing.name);
  const name = ing.name.replace(/'/g, "''");
  console.log(`INSERT INTO inventory_items (name, unit, cost_per_unit, quantity, min_quantity, category) VALUES ('${name}', '${ing.unit}', ${ing.cost_per_unit}, 0, 0, '${cat}') ON CONFLICT (name) DO NOTHING;`);
}
