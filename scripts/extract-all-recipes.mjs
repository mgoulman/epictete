// Robust recipe extraction from ALL fiche technique Excel files
// Handles horizontal + vertical stacking, varying column orders
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const files = [
  { path: 'fiche technique entrée froide.xlsx', category: 'entrée froide' },
  { path: 'fiche technique pâte.xlsx', category: 'pâtes' },
  { path: 'fiche technique dessert.xlsx', category: 'dessert' },
  { path: 'fiche technique Risotto et ravioli.xlsx', category: 'pâtes' },
  { path: 'fiche technique petit déjeuner.xlsx', category: 'petit déjeuner' },
  { path: 'fiche technique pizza.xlsx', category: 'pizza' },
  { path: 'fiche technique plats.xlsx', category: 'plats' },
];

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  let str = String(value).replace(',', '.').replace(/[^\d.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function getCell(data, row, col) {
  if (!data[row]) return '';
  const cell = data[row][col];
  if (cell === null || cell === undefined) return '';
  return String(cell).trim();
}

function getCellLower(data, row, col) {
  return getCell(data, row, col).toLowerCase();
}

// Find all "Article" header positions in the sheet
function findArticleHeaders(data) {
  const headers = [];
  for (let row = 0; row < data.length; row++) {
    if (!data[row]) continue;
    for (let col = 0; col < (data[row].length || 0); col++) {
      if (getCellLower(data, row, col) === 'article') {
        headers.push({ row, col });
      }
    }
  }
  return headers;
}

// Determine column mapping from the header row
// Returns { nameCol, unitCol, qtyCol, priceCol, totalCol }
function detectColumnLayout(data, headerRow, startCol) {
  const mapping = { nameCol: startCol, unitCol: startCol + 1, qtyCol: -1, priceCol: -1, totalCol: -1 };

  // Check columns startCol+2, startCol+3, startCol+4
  for (let c = startCol + 2; c <= startCol + 4; c++) {
    const h = getCellLower(data, headerRow, c);
    if (h.includes('quantité') || h.includes('unite necessaire') || h.includes('quantite')) {
      mapping.qtyCol = c;
    } else if (h.includes('prix de revient') || h.includes('total') || h === 'prix revient') {
      // This is the "total cost" column ONLY if it says "prix de revient" (with "de") or "total"
      mapping.totalCol = c;
    } else if (h.includes('prix') || h.includes('cout') || h.includes('coût')) {
      mapping.priceCol = c;
    }
  }

  // Fallback: if we couldn't detect, use positional guessing
  // Common layouts:
  // Layout A (plats/risotto/petit déjeuner): Article, unité, Quantité, prix, prix revient
  // Layout B (pizza col 0): Article, Unité, prix, Quantité, Prix de revient
  // Layout C (pizza col 6+): Article, Unité, Cout, Unite necessaire, Prix de revient

  if (mapping.qtyCol === -1 && mapping.priceCol === -1 && mapping.totalCol === -1) {
    // Default: Article(0), unité(1), Quantité(2), prix(3), prix revient(4)
    mapping.qtyCol = startCol + 2;
    mapping.priceCol = startCol + 3;
    mapping.totalCol = startCol + 4;
  } else if (mapping.qtyCol === -1) {
    // If we found price but not qty, qty is the remaining column
    for (let c = startCol + 2; c <= startCol + 4; c++) {
      if (c !== mapping.priceCol && c !== mapping.totalCol && c !== mapping.unitCol) {
        mapping.qtyCol = c;
        break;
      }
    }
  } else if (mapping.priceCol === -1) {
    for (let c = startCol + 2; c <= startCol + 4; c++) {
      if (c !== mapping.qtyCol && c !== mapping.totalCol && c !== mapping.unitCol) {
        mapping.priceCol = c;
        break;
      }
    }
  }
  if (mapping.totalCol === -1) {
    // Total is usually the last column
    mapping.totalCol = startCol + 4;
  }

  return mapping;
}

// Look backward from Article header to find recipe name, portions, cost
function findRecipeInfo(data, articleRow, col) {
  let name = '';
  let portions = 1;
  let costPrice = 0;
  let sellingPrice = 0;

  // Search up to 10 rows above
  for (let r = articleRow - 1; r >= Math.max(0, articleRow - 10); r--) {
    const cellLower = getCellLower(data, r, col);
    const cellRaw = getCell(data, r, col);

    if (cellLower.includes('nombre') && (cellLower.includes('portion') || cellLower.includes('ration'))) {
      // Look for number in nearby columns
      for (let c = col + 1; c <= col + 5; c++) {
        const num = parseNumber(getCell(data, r, c));
        if (num > 0) { portions = Math.round(num); break; }
      }
      // Also check col+4
      if (portions === 1) {
        const num = parseNumber(getCell(data, r, col + 4));
        if (num > 0) portions = Math.round(num);
      }
    } else if (cellLower.includes('prix') && (cellLower.includes('revient') || cellLower.includes('cout'))) {
      for (let c = col + 1; c <= col + 5; c++) {
        const num = parseNumber(getCell(data, r, c));
        if (num > 0) { costPrice = num; break; }
      }
      if (costPrice === 0) {
        const num = parseNumber(getCell(data, r, col + 4));
        if (num > 0) costPrice = num;
      }
    } else if (cellLower.includes('prix') && (cellLower.includes('vente') || cellLower.includes('ttc'))) {
      for (let c = col + 1; c <= col + 5; c++) {
        const num = parseNumber(getCell(data, r, c));
        if (num > 0) { sellingPrice = num; break; }
      }
    } else if (cellRaw && !cellLower.includes('prix') && !cellLower.includes('nombre') &&
               !cellLower.includes('ration') && !cellLower.includes('article') &&
               !cellLower.includes('unité') && !cellLower.includes('unite') &&
               !cellLower.includes('coef') && !cellLower.includes('totale') &&
               cellRaw.length > 2) {
      // This could be the recipe name - take the first non-metadata cell found going up
      if (!name) name = cellRaw;
    }
  }

  return { name, portions, costPrice, sellingPrice };
}

// Extract ingredients starting from the row after Article header
function extractIngredients(data, startRow, layout) {
  const ingredients = [];

  for (let row = startRow; row < data.length; row++) {
    const name = getCell(data, row, layout.nameCol);

    // Stop conditions
    if (!name) break;
    const nameLower = name.toLowerCase();
    if (nameLower.includes('totale revient') || nameLower.includes('total revient')) break;
    if (nameLower.includes('nombre') && (nameLower.includes('portion') || nameLower.includes('ration'))) break;
    if (nameLower === 'article') break;
    if (nameLower.includes('coef')) break;

    // Skip non-ingredient items
    if (['rt', 'ration', 'pc', 'kg', 'l', 'g', 'ml'].includes(nameLower)) continue;

    const unit = getCell(data, row, layout.unitCol) || 'kg';
    const qty = parseNumber(getCell(data, row, layout.qtyCol));
    const price = parseNumber(getCell(data, row, layout.priceCol));
    const total = parseNumber(getCell(data, row, layout.totalCol)) || (qty * price);

    if (qty > 0 || price > 0 || total > 0) {
      ingredients.push({
        ingredient_name: name,
        unit: unit.toLowerCase().replace(/\s/g, ''),
        quantity: qty,
        unit_cost: price,
        total_cost: total
      });
    }
  }

  return ingredients;
}

// Main extraction per sheet
function extractRecipesFromSheet(data, defaultCategory) {
  const recipes = [];
  const articleHeaders = findArticleHeaders(data);

  for (const { row: articleRow, col } of articleHeaders) {
    const layout = detectColumnLayout(data, articleRow, col);
    const info = findRecipeInfo(data, articleRow, col);
    const ingredients = extractIngredients(data, articleRow + 1, layout);

    if (!info.name) {
      // Try to get name from column header area
      continue;
    }

    if (ingredients.length === 0) continue;

    const recipe = {
      name: info.name,
      portions: info.portions,
      cost_price: info.costPrice || ingredients.reduce((s, i) => s + i.total_cost, 0),
      selling_price: info.sellingPrice || null,
      category: defaultCategory,
      ingredients
    };

    recipes.push(recipe);
  }

  return recipes;
}

// Deduplicate recipes by name (keep the one with more ingredients)
function deduplicateRecipes(recipes) {
  const map = new Map();
  for (const r of recipes) {
    const key = r.name.toLowerCase().trim();
    if (!map.has(key) || map.get(key).ingredients.length < r.ingredients.length) {
      map.set(key, r);
    }
  }
  return Array.from(map.values());
}

// Main
const allRecipes = [];

for (const file of files) {
  const filePath = join(projectRoot, file.path);
  console.error(`\nProcessing: ${file.path}`);

  try {
    const buffer = readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (data.length > 0) {
        const recipes = extractRecipesFromSheet(data, file.category);
        console.error(`  Sheet ${sheetName}: found ${recipes.length} recipes`);
        for (const r of recipes) {
          console.error(`    - ${r.name} (${r.ingredients.length} ingredients, ${r.cost_price.toFixed(2)} DH)`);
        }
        allRecipes.push(...recipes);
      }
    }
  } catch (err) {
    console.error(`  Error: ${err.message}`);
  }
}

const deduplicated = deduplicateRecipes(allRecipes);

console.error(`\n========================================`);
console.error(`Total recipes extracted: ${allRecipes.length}`);
console.error(`After deduplication: ${deduplicated.length}`);
console.error(`========================================\n`);

// Output as JSON
console.log(JSON.stringify(deduplicated, null, 2));
