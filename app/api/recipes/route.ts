import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';

// GET - Fetch recipes or recipe details
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') || 'list';

    if (id) {
      // Get single recipe with ingredients
      const { data: recipe, error } = await supabase
        .from('recipes')
        .select(`
          *,
          ingredients:recipe_ingredients(
            *,
            inventory_item:inventory_items(id, name, unit, cost_per_unit)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return NextResponse.json({ recipe });
    }

    if (type === 'list') {
      // Get all recipes with ingredient count
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select(`
          *,
          ingredients:recipe_ingredients(id)
        `)
        .order('name');

      if (error) throw error;

      const recipesWithCount = (recipes || []).map(r => ({
        ...r,
        ingredient_count: r.ingredients?.length || 0,
        ingredients: undefined
      }));

      return NextResponse.json({ recipes: recipesWithCount });
    }

    if (type === 'unassigned') {
      // Get recipes not assigned to any menu item
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select('id, name, name_fr, category, cost_price')
        .order('name');

      if (error) throw error;
      return NextResponse.json({ recipes });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Recipes GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

// POST - Create recipe or add ingredient
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { type, ...data } = body;

    if (type === 'recipe') {
      const { data: result, error } = await supabase
        .from('recipes')
        .insert({
          name: data.name,
          name_fr: data.name_fr || null,
          category: data.category || null,
          portions: data.portions || 1,
          cost_price: data.cost_price || 0,
          selling_price: data.selling_price || null,
          preparation_time: data.preparation_time || null,
          cooking_time: data.cooking_time || null,
          difficulty: data.difficulty || null,
          instructions: data.instructions || null,
          notes: data.notes || null
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, recipe: result });
    }

    if (type === 'ingredient') {
      const totalCost = (data.quantity || 0) * (data.unit_cost || 0);

      const { data: result, error } = await supabase
        .from('recipe_ingredients')
        .insert({
          recipe_id: data.recipe_id,
          inventory_item_id: data.inventory_item_id || null,
          ingredient_name: data.ingredient_name,
          quantity: data.quantity,
          unit: data.unit,
          unit_cost: data.unit_cost || 0,
          total_cost: totalCost
        })
        .select(`
          *,
          inventory_item:inventory_items(id, name, unit, cost_per_unit)
        `)
        .single();

      if (error) throw error;

      // Recalculate recipe cost
      await recalculateRecipeCost(supabase, data.recipe_id);

      return NextResponse.json({ success: true, ingredient: result });
    }

    if (type === 'bulk-ingredients') {
      // Add multiple ingredients at once (for import)
      const ingredients = data.ingredients.map((ing: any) => ({
        recipe_id: data.recipe_id,
        inventory_item_id: ing.inventory_item_id || null,
        ingredient_name: ing.ingredient_name,
        quantity: ing.quantity,
        unit: ing.unit,
        unit_cost: ing.unit_cost || 0,
        total_cost: (ing.quantity || 0) * (ing.unit_cost || 0)
      }));

      const { error } = await supabase
        .from('recipe_ingredients')
        .insert(ingredients);

      if (error) throw error;

      // Recalculate recipe cost
      await recalculateRecipeCost(supabase, data.recipe_id);

      return NextResponse.json({ success: true });
    }

    if (type === 'import') {
      // Import recipe with all ingredients
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          name: data.name,
          name_fr: data.name_fr || data.name,
          category: data.category,
          portions: data.portions || 1,
          cost_price: data.cost_price || 0,
          notes: data.notes
        })
        .select()
        .single();

      if (recipeError) throw recipeError;

      if (data.ingredients && data.ingredients.length > 0) {
        const ingredients = data.ingredients.map((ing: any) => ({
          recipe_id: recipe.id,
          inventory_item_id: null,
          ingredient_name: ing.ingredient_name,
          quantity: ing.quantity,
          unit: ing.unit,
          unit_cost: ing.unit_cost || 0,
          total_cost: (ing.quantity || 0) * (ing.unit_cost || 0)
        }));

        const { error: ingError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredients);

        if (ingError) throw ingError;
      }

      return NextResponse.json({ success: true, recipe });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Recipes POST error:', error);
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
  }
}

// PATCH - Update recipe or ingredient
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { type, id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    if (type === 'recipe') {
      const { data: result, error } = await supabase
        .from('recipes')
        .update({
          name: data.name,
          name_fr: data.name_fr,
          category: data.category,
          portions: data.portions,
          selling_price: data.selling_price,
          preparation_time: data.preparation_time,
          cooking_time: data.cooking_time,
          difficulty: data.difficulty,
          instructions: data.instructions,
          notes: data.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, recipe: result });
    }

    if (type === 'ingredient') {
      const totalCost = (data.quantity || 0) * (data.unit_cost || 0);

      const { data: result, error } = await supabase
        .from('recipe_ingredients')
        .update({
          inventory_item_id: data.inventory_item_id || null,
          ingredient_name: data.ingredient_name,
          quantity: data.quantity,
          unit: data.unit,
          unit_cost: data.unit_cost || 0,
          total_cost: totalCost
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Recalculate recipe cost
      if (result.recipe_id) {
        await recalculateRecipeCost(supabase, result.recipe_id);
      }

      return NextResponse.json({ success: true, ingredient: result });
    }

    if (type === 'assign-menu-item') {
      // Assign recipe to menu item
      const { error } = await supabase
        .from('menu_items')
        .update({ recipe_id: data.recipe_id })
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Recipes PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
  }
}

// DELETE - Remove recipe or ingredient
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json({ error: 'Type and ID required' }, { status: 400 });
    }

    if (type === 'recipe') {
      // First unlink from any menu items
      await supabase
        .from('menu_items')
        .update({ recipe_id: null })
        .eq('recipe_id', id);

      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (type === 'ingredient') {
      // Get recipe_id before deleting
      const { data: ingredient } = await supabase
        .from('recipe_ingredients')
        .select('recipe_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Recalculate recipe cost
      if (ingredient?.recipe_id) {
        await recalculateRecipeCost(supabase, ingredient.recipe_id);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Recipes DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
  }
}

// Helper function to recalculate recipe cost
async function recalculateRecipeCost(supabase: any, recipeId: string) {
  const { data: ingredients } = await supabase
    .from('recipe_ingredients')
    .select('total_cost')
    .eq('recipe_id', recipeId);

  const totalCost = (ingredients || []).reduce((sum: number, ing: any) => sum + (ing.total_cost || 0), 0);

  await supabase
    .from('recipes')
    .update({ cost_price: totalCost, updated_at: new Date().toISOString() })
    .eq('id', recipeId);
}
