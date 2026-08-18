// Script to extract unique ingredients from Excel files
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

      if (ingredientName && !['kg', 'l', 'pc', 'g', 'ml'].includes(ingredientName.toLowerCase())) {
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
  console.log(`\nProcessing: ${file.path}`);

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
          // Update cost if higher (more recent or accurate)
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
console.log('UNIQUE INGREDIENTS FOUND');
console.log('========================================\n');

// Group by unit
const byUnit = {};
for (const ing of sortedIngredients) {
  const unit = ing.unit || 'unknown';
  if (!byUnit[unit]) byUnit[unit] = [];
  byUnit[unit].push(ing);
}

for (const [unit, items] of Object.entries(byUnit)) {
  console.log(`\n--- Unit: ${unit.toUpperCase()} (${items.length} items) ---`);
  for (const ing of items) {
    console.log(`  ${ing.name.padEnd(30)} | Cost: ${ing.cost_per_unit.toFixed(2).padStart(8)} DH | Used ${ing.count}x`);
  }
}

console.log('\n========================================');
console.log(`TOTAL: ${sortedIngredients.length} unique ingredients`);
console.log('========================================\n');

// Output as JSON for import
console.log('\n// JSON format for import:');
console.log(JSON.stringify(sortedIngredients.map(ing => ({
  name: ing.name,
  unit: ing.unit,
  cost_per_unit: ing.cost_per_unit,
  quantity: 0,
  min_quantity: 0,
  category: 'imported'
})), null, 2));
