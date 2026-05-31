// Script to extract recipes from Excel files (horizontal layout)
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
  { path: 'fiche technique dessert.xlsx', category: 'dessert' },
  { path: 'fiche technique Risotto et ravioli.xlsx', category: 'pâtes' },
  { path: 'fiche technique petit déjeuner.xlsx', category: 'petit déjeuner' },
  { path: 'fiche technique pizza.xlsx', category: 'pizza' },
  { path: 'fiche technique plats.xlsx', category: 'plats' }
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

function extractRecipesHorizontal(data, defaultCategory) {
  const recipes = [];

  // Find recipe starting columns by looking for names in row 1
  // Then track each recipe's column range (6 columns per recipe typically)
  const recipeColumns = [];

  if (data[1]) {
    for (let col = 0; col < data[1].length; col++) {
      const cell = getCell(data, 1, col);
      if (cell && !cell.toLowerCase().includes('nombre') &&
          !cell.toLowerCase().includes('prix') &&
          !cell.toLowerCase().includes('article')) {
        recipeColumns.push({ name: cell, startCol: col });
      }
    }
  }

  // For each recipe column, extract data
  for (const recipeInfo of recipeColumns) {
    const col = recipeInfo.startCol;
    const recipe = {
      name: recipeInfo.name,
      portions: 1,
      cost_price: 0,
      category: defaultCategory,
      ingredients: []
    };

    // Find portions, cost_price by scanning rows 2-6
    for (let row = 2; row <= 10; row++) {
      const label = getCell(data, row, col).toLowerCase();

      if (label.includes('nombre de portion') || label.includes('nombre de ration')) {
        // Look for number in columns to the right
        for (let c = col + 1; c <= col + 5; c++) {
          const num = parseNumber(getCell(data, row, c));
          if (num > 0) {
            recipe.portions = Math.round(num);
            break;
          }
        }
      }

      if (label.includes('prix de revient') || label.includes('prix revient')) {
        for (let c = col + 1; c <= col + 5; c++) {
          const num = parseNumber(getCell(data, row, c));
          if (num > 0) {
            recipe.cost_price = num;
            break;
          }
        }
      }
    }

    // Find ingredient header row (Article, unité, ...)
    let ingredientStartRow = -1;
    for (let row = 5; row <= 15; row++) {
      const cell = getCell(data, row, col).toLowerCase();
      if (cell === 'article') {
        ingredientStartRow = row + 1;
        break;
      }
    }

    // Extract ingredients
    if (ingredientStartRow > 0) {
      for (let row = ingredientStartRow; row < data.length; row++) {
        const name = getCell(data, row, col);
        const unit = getCell(data, row, col + 1) || 'kg';
        const qty = parseNumber(getCell(data, row, col + 2));
        const price = parseNumber(getCell(data, row, col + 3));
        const total = parseNumber(getCell(data, row, col + 4)) || (qty * price);

        // Stop if we hit an empty row or a new section
        if (!name) break;
        if (name.toLowerCase().includes('nombre') ||
            name.toLowerCase().includes('prix') ||
            name.toLowerCase() === 'article') break;

        // Skip non-ingredient items
        if (['rt', 'ration', 'pc', 'kg', 'l'].includes(name.toLowerCase())) continue;

        if (qty > 0 || price > 0) {
          recipe.ingredients.push({
            ingredient_name: name,
            unit: unit.toLowerCase().replace(' ', ''),
            quantity: qty,
            unit_cost: price,
            total_cost: total
          });
        }
      }
    }

    if (recipe.ingredients.length > 0) {
      // Calculate cost if not found
      if (recipe.cost_price === 0) {
        recipe.cost_price = recipe.ingredients.reduce((sum, ing) => sum + ing.total_cost, 0);
      }
      recipes.push(recipe);
    }
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

      if (data.length > 0) {
        const recipes = extractRecipesHorizontal(data, file.category);
        console.error(`  Sheet ${sheetName}: found ${recipes.length} recipes`);
        allRecipes.push(...recipes);
      }
    }
  } catch (err) {
    console.error(`  Error: ${err.message}`);
  }
}

console.error(`\n========================================`);
console.error(`Total recipes found: ${allRecipes.length}`);
console.error(`========================================\n`);

// Print recipe list
for (const recipe of allRecipes) {
  console.error(`- ${recipe.name} (${recipe.category}): ${recipe.ingredients.length} ingredients, ${recipe.cost_price.toFixed(2)} DH`);
}

// Output as JSON
console.log(JSON.stringify(allRecipes, null, 2));
