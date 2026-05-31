// Script to import recipes from Excel files into Supabase
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: join(projectRoot, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Check .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Files to import
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

    // Detect recipe start - a name followed by empty cells
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
        selling_price: 0,
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
          unit: unit,
          quantity: quantity,
          unit_cost: unitCost,
          total_cost: totalCost
        });
      }
    }

    // Check for end of ingredients
    if (inIngredients && cleanRow[0] === '' && cleanRow[1] === '' && cleanRow[4]) {
      inIngredients = false;
    }
  }

  // Don't forget the last recipe
  if (currentRecipe && currentRecipe.ingredients.length > 0) {
    recipes.push(currentRecipe);
  }

  return recipes;
}

async function importRecipes() {
  console.log('Starting recipe import...\n');
  let totalImported = 0;
  let totalSkipped = 0;

  for (const file of files) {
    const filePath = join(projectRoot, file.path);
    console.log(`\nProcessing: ${file.path}`);

    try {
      const buffer = readFileSync(filePath);
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      let fileRecipes = [];
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const sheetRecipes = parseSheet(data, file.category);
        fileRecipes.push(...sheetRecipes);
      }

      console.log(`  Found ${fileRecipes.length} recipes in file`);

      for (const recipe of fileRecipes) {
        // Check if recipe already exists
        const { data: existing } = await supabase
          .from('recipes')
          .select('id')
          .ilike('name', recipe.name)
          .single();

        if (existing) {
          console.log(`  - Skipped (exists): ${recipe.name}`);
          totalSkipped++;
          continue;
        }

        // Create recipe
        const { data: newRecipe, error: recipeError } = await supabase
          .from('recipes')
          .insert({
            name: recipe.name,
            name_fr: recipe.name,
            category: recipe.category,
            portions: recipe.portions,
            cost_price: recipe.cost_price || recipe.ingredients.reduce((sum, ing) => sum + ing.total_cost, 0)
          })
          .select()
          .single();

        if (recipeError) {
          console.log(`  - Error creating: ${recipe.name} - ${recipeError.message}`);
          continue;
        }

        // Add ingredients
        if (recipe.ingredients.length > 0) {
          const ingredients = recipe.ingredients.map(ing => ({
            recipe_id: newRecipe.id,
            ingredient_name: ing.ingredient_name,
            quantity: ing.quantity,
            unit: ing.unit,
            unit_cost: ing.unit_cost,
            total_cost: ing.total_cost
          }));

          const { error: ingError } = await supabase
            .from('recipe_ingredients')
            .insert(ingredients);

          if (ingError) {
            console.log(`  - Error adding ingredients for: ${recipe.name}`);
          }
        }

        console.log(`  + Imported: ${recipe.name} (${recipe.ingredients.length} ingredients)`);
        totalImported++;
      }
    } catch (err) {
      console.error(`  Error processing file: ${err.message}`);
    }
  }

  console.log('\n========================================');
  console.log(`Import complete!`);
  console.log(`  Imported: ${totalImported} recipes`);
  console.log(`  Skipped: ${totalSkipped} (already exist)`);
  console.log('========================================\n');
}

importRecipes().catch(console.error);
