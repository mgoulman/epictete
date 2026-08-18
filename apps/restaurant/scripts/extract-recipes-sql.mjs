// Script to extract recipes from Excel files and output SQL
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

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

function parseSheet(data, defaultCategory) {
  const recipes = [];
  let currentRecipe = null;
  let inIngredients = false;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const cleanRow = row.map(cell => {
      if (cell === null || cell === undefined) return '';
      return String(cell).trim();
    });

    const firstCell = cleanRow[0]?.toLowerCase() || '';

    // Detect recipe start
    if (firstCell &&
        !firstCell.includes('nombre') &&
        !firstCell.includes('prix') &&
        !firstCell.includes('article') &&
        !firstCell.includes('unité') &&
        !['kg', 'l', 'pc', 'g', 'ml'].includes(firstCell) &&
        cleanRow[1] === '' &&
        !inIngredients) {

      if (currentRecipe && currentRecipe.ingredients.length > 0) {
        recipes.push(currentRecipe);
      }

      currentRecipe = {
        name: cleanRow[0],
        portions: 1,
        cost_price: 0,
        category: defaultCategory,
        ingredients: []
      };
      inIngredients = false;
      continue;
    }

    if (!currentRecipe) continue;

    // Check for portions
    if (firstCell.includes('nombre de portion') || firstCell.includes('nombre de ration')) {
      for (const cell of cleanRow) {
        const num = parseNumber(cell);
        if (num > 0) {
          currentRecipe.portions = num;
          break;
        }
      }
      continue;
    }

    // Check for cost price
    if (firstCell.includes('prix de revient') || firstCell.includes('prix revient')) {
      for (const cell of cleanRow) {
        const num = parseNumber(cell);
        if (num > 0) {
          currentRecipe.cost_price = num;
          break;
        }
      }
      continue;
    }

    // Check for ingredient header
    if (firstCell === 'article') {
      inIngredients = true;
      continue;
    }

    // Parse ingredient row
    if (inIngredients && cleanRow[0] && cleanRow[0] !== '') {
      const ingredientName = cleanRow[0];
      const unit = cleanRow[1] || 'kg';
      const quantity = parseNumber(cleanRow[2]);
      const unitCost = parseNumber(cleanRow[3]);
      const totalCost = parseNumber(cleanRow[4]) || (quantity * unitCost);

      if (ingredientName && (quantity > 0 || unitCost > 0)) {
        currentRecipe.ingredients.push({
          ingredient_name: ingredientName,
          unit: unit.toLowerCase(),
          quantity: quantity,
          unit_cost: unitCost,
          total_cost: totalCost
        });
      }
    }

    // Check for end of ingredients
    if (inIngredients && cleanRow[0] === '' && cleanRow[1] === '') {
      inIngredients = false;
    }
  }

  // Don't forget the last recipe
  if (currentRecipe && currentRecipe.ingredients.length > 0) {
    recipes.push(currentRecipe);
  }

  return recipes;
}

// Main extraction
const allRecipes = [];

for (const file of files) {
  const filePath = join(projectRoot, file.path);
  console.error(`Processing: ${file.path}`);

  try {
    const buffer = readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const recipes = parseSheet(data, file.category);
      allRecipes.push(...recipes);
    }
  } catch (err) {
    console.error(`  Error: ${err.message}`);
  }
}

console.error(`\nTotal recipes found: ${allRecipes.length}\n`);

// Output as JSON for easy processing
console.log(JSON.stringify(allRecipes, null, 2));
