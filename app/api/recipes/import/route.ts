import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, enforce } from '@/lib/auth/supabase-server';
import * as XLSX from 'xlsx';

interface ParsedRecipe {
  name: string;
  portions: number;
  cost_price: number;
  selling_price: number;
  category: string;
  ingredients: {
    ingredient_name: string;
    unit: string;
    quantity: number;
    unit_cost: number;
    total_cost: number;
  }[];
}

// POST - Import recipes from Excel file
export async function POST(request: NextRequest) {
  const denied = await enforce('recipes.write'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string || 'general';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    const recipes: ParsedRecipe[] = [];

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Parse the sheet to extract recipes
      const sheetRecipes = parseSheet(data, category);
      recipes.push(...sheetRecipes);
    }

    // Import recipes to database
    let importedCount = 0;
    const errors: string[] = [];

    for (const recipe of recipes) {
      try {
        // Check if recipe already exists
        const { data: existing } = await supabase
          .from('recipes')
          .select('id')
          .ilike('name', recipe.name)
          .single();

        if (existing) {
          // Skip existing recipes
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
            cost_price: recipe.cost_price
          })
          .select()
          .single();

        if (recipeError) {
          errors.push(`Failed to create recipe: ${recipe.name}`);
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
            errors.push(`Failed to add ingredients for: ${recipe.name}`);
          }
        }

        importedCount++;
      } catch (err) {
        errors.push(`Error processing: ${recipe.name}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedCount,
      total: recipes.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Recipe import error:', error);
    return NextResponse.json({ error: 'Failed to import recipes' }, { status: 500 });
  }
}

function parseSheet(data: any[][], defaultCategory: string): ParsedRecipe[] {
  const recipes: ParsedRecipe[] = [];
  let currentRecipe: ParsedRecipe | null = null;
  let inIngredients = false;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    // Clean the row - remove empty values
    const cleanRow = row.map(cell => {
      if (cell === null || cell === undefined) return '';
      return String(cell).trim();
    });

    // Check for recipe name (first column has text, not a standard header)
    const firstCell = cleanRow[0]?.toLowerCase() || '';

    // Detect recipe start - a name followed by empty cells or specific patterns
    if (firstCell &&
        !firstCell.includes('nombre') &&
        !firstCell.includes('prix') &&
        !firstCell.includes('article') &&
        !firstCell.includes('unité') &&
        !['kg', 'l', 'pc', 'g', 'ml'].includes(firstCell) &&
        cleanRow[1] === '' &&
        !inIngredients) {

      // Save previous recipe if exists
      if (currentRecipe && currentRecipe.ingredients.length > 0) {
        recipes.push(currentRecipe);
      }

      // Start new recipe
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
      const portionValue = findNumber(cleanRow);
      if (portionValue) currentRecipe.portions = portionValue;
      continue;
    }

    // Check for cost price
    if (firstCell.includes('prix de revient') || firstCell.includes('prix revient')) {
      const costValue = findNumber(cleanRow);
      if (costValue) currentRecipe.cost_price = costValue;
      continue;
    }

    // Check for selling price
    if (firstCell.includes('prix vente') || firstCell.includes('prix de vente')) {
      const priceValue = findNumber(cleanRow);
      if (priceValue) currentRecipe.selling_price = priceValue;
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

      // Skip if no valid data
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

    // Check for end of ingredients (total row or empty significant row)
    if (inIngredients && cleanRow[0] === '' && cleanRow[1] === '' && cleanRow[4]) {
      // This might be a total row, end ingredients section
      inIngredients = false;
    }
  }

  // Don't forget the last recipe
  if (currentRecipe && currentRecipe.ingredients.length > 0) {
    recipes.push(currentRecipe);
  }

  return recipes;
}

function findNumber(row: string[]): number {
  for (const cell of row) {
    const num = parseNumber(cell);
    if (num > 0) return num;
  }
  return 0;
}

function parseNumber(value: any): number {
  if (value === null || value === undefined || value === '') return 0;

  // Handle string numbers with comma decimal separator
  let str = String(value).replace(',', '.').replace(/[^\d.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}
