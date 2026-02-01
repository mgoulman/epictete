import { SupabaseClient } from '@supabase/supabase-js';

// --- Types ---

export interface PurchaseOrderItem {
  inventory_item_id: string;
  name: string;
  current_stock: number;
  daily_avg_usage: number;
  forecast_usage: number;
  projected_stock: number;
  minimum_stock: number;
  suggested_quantity: number;
  unit: string;
  cost_per_unit: number;
  estimated_cost: number;
  reason: string;
}

export interface SupplierDraft {
  supplier_name: string;
  items: PurchaseOrderItem[];
  total_estimated_cost: number;
}

export interface SuggestParams {
  lookback_days: number;
  lead_time_days: number;
  safety_buffer_pct: number;
}

export interface SuggestResult {
  drafts: SupplierDraft[];
  unassigned_items: PurchaseOrderItem[];
  generated_at: string;
  parameters: { lookback_days: number; lead_time_days: number; safety_buffer_pct: number };
  coverage: { total_inventory: number; items_with_usage: number; items_needing_reorder: number };
}

// --- Core computation ---

export async function computeSuggestions(
  supabase: SupabaseClient,
  params: SuggestParams
): Promise<SuggestResult> {
  const { lookback_days, lead_time_days, safety_buffer_pct } = params;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookback_days);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  // 1. Fetch all data in parallel
  const [inventoryRes, salesRes, menuRes, recipesRes, ingredientsRes] = await Promise.all([
    supabase.from('inventory_items').select('*'),
    supabase
      .from('sales_items')
      .select('product_name, quantity, sale_date')
      .gte('sale_date', cutoffStr),
    supabase.from('menu_items').select('id, name, name_fr, recipe_id'),
    supabase.from('recipes').select('id, name, portions'),
    supabase.from('recipe_ingredients').select('recipe_id, inventory_item_id, ingredient_name, quantity, unit'),
  ]);

  const inventory = inventoryRes.data ?? [];
  const sales = salesRes.data ?? [];
  const menuItems = menuRes.data ?? [];
  const recipes = recipesRes.data ?? [];
  const recipeIngredients = ingredientsRes.data ?? [];

  // 2. Build mappings

  // product_name (trimmed) -> menu_item.id
  const productToMenuItemId = new Map<string, string>();
  for (const mi of menuItems) {
    const keyEn = mi.name?.trim().toLowerCase();
    const keyFr = mi.name_fr?.trim().toLowerCase();
    if (keyEn) productToMenuItemId.set(keyEn, mi.id);
    if (keyFr) productToMenuItemId.set(keyFr, mi.id);
  }

  // menu_item.id -> recipe_id
  const menuItemToRecipeId = new Map<string, string>();
  for (const mi of menuItems) {
    if (mi.recipe_id) {
      menuItemToRecipeId.set(mi.id, mi.recipe_id);
    }
  }

  // recipe.id -> portions
  const recipePortions = new Map<string, number>();
  for (const r of recipes) {
    recipePortions.set(r.id, r.portions || 1);
  }

  // inventory name (lowercase) -> inventory_item.id
  const inventoryNameToId = new Map<string, string>();
  for (const inv of inventory) {
    if (inv.name) {
      inventoryNameToId.set(inv.name.trim().toLowerCase(), inv.id);
    }
  }

  // recipe_id -> [{resolved_inventory_item_id, quantity_per_portion}]
  const recipeIngredientMap = new Map<string, { inventory_item_id: string; quantity_per_portion: number }[]>();
  for (const ri of recipeIngredients) {
    // Resolve inventory_item_id: use FK if set, otherwise name-based fallback
    let invId = ri.inventory_item_id;
    if (!invId && ri.ingredient_name) {
      invId = inventoryNameToId.get(ri.ingredient_name.trim().toLowerCase()) ?? null;
    }
    if (!invId || !ri.recipe_id) continue;

    const portions = recipePortions.get(ri.recipe_id) || 1;
    const list = recipeIngredientMap.get(ri.recipe_id) ?? [];
    list.push({
      inventory_item_id: invId,
      quantity_per_portion: (ri.quantity || 0) / portions,
    });
    recipeIngredientMap.set(ri.recipe_id, list);
  }

  // 3. Compute daily average usage per inventory item
  const usageAccumulator = new Map<string, number>(); // inventory_item_id -> total usage

  for (const sale of sales) {
    const trimmedName = sale.product_name?.replace(/\s*-\s*$/, '').trim().toLowerCase();
    if (!trimmedName) continue;

    const menuItemId = productToMenuItemId.get(trimmedName);
    if (!menuItemId) continue;

    const recipeId = menuItemToRecipeId.get(menuItemId);
    if (!recipeId) continue;

    const ingredients = recipeIngredientMap.get(recipeId);
    if (!ingredients) continue;

    const saleQty = sale.quantity || 0;
    for (const ing of ingredients) {
      const usage = ing.quantity_per_portion * saleQty;
      usageAccumulator.set(
        ing.inventory_item_id,
        (usageAccumulator.get(ing.inventory_item_id) ?? 0) + usage
      );
    }
  }

  // 4. Forecast and reorder decision per inventory item
  const reorderItems: PurchaseOrderItem[] = [];
  let itemsWithUsage = 0;

  for (const inv of inventory) {
    const totalUsage = usageAccumulator.get(inv.id) ?? 0;
    const dailyAvg = lookback_days > 0 ? totalUsage / lookback_days : 0;
    if (totalUsage > 0) itemsWithUsage++;

    const forecastUsage = dailyAvg * lead_time_days;
    const projectedStock = (inv.quantity ?? 0) - forecastUsage;
    const minimumStock = inv.minimum_stock ?? 0;
    const targetStock = minimumStock * (1 + safety_buffer_pct);

    const needsReorder = projectedStock < minimumStock;
    if (!needsReorder) continue;

    const suggestedQty = Math.max(0, Math.ceil((targetStock - projectedStock) * 100) / 100);
    if (suggestedQty <= 0) continue;

    const costPerUnit = inv.cost_per_unit ?? 0;

    // Build reason
    const reasons: string[] = [];
    if (dailyAvg > 0) {
      reasons.push(`usage moy. ${dailyAvg.toFixed(2)}/${inv.unit ?? 'unit'}/jour`);
    }
    if (projectedStock < 0) {
      reasons.push(`rupture prevue dans ${lead_time_days}j`);
    } else if (projectedStock < minimumStock) {
      reasons.push(`stock proj. ${projectedStock.toFixed(1)} < min ${minimumStock}`);
    }
    if (inv.quantity === 0) {
      reasons.push('stock actuel a zero');
    }

    reorderItems.push({
      inventory_item_id: inv.id,
      name: inv.name,
      current_stock: inv.quantity ?? 0,
      daily_avg_usage: Math.round(dailyAvg * 1000) / 1000,
      forecast_usage: Math.round(forecastUsage * 100) / 100,
      projected_stock: Math.round(projectedStock * 100) / 100,
      minimum_stock: minimumStock,
      suggested_quantity: suggestedQty,
      unit: inv.unit ?? '',
      cost_per_unit: costPerUnit,
      estimated_cost: Math.round(suggestedQty * costPerUnit * 100) / 100,
      reason: reasons.join('; ') || 'stock sous le minimum',
    });
  }

  // 5. Group by supplier
  const supplierMap = new Map<string, PurchaseOrderItem[]>();
  const unassigned: PurchaseOrderItem[] = [];

  for (const item of reorderItems) {
    const inv = inventory.find((i) => i.id === item.inventory_item_id);
    const supplier = inv?.supplier?.trim();
    if (supplier) {
      const list = supplierMap.get(supplier) ?? [];
      list.push(item);
      supplierMap.set(supplier, list);
    } else {
      unassigned.push(item);
    }
  }

  const drafts: SupplierDraft[] = Array.from(supplierMap.entries())
    .map(([supplier_name, items]) => ({
      supplier_name,
      items,
      total_estimated_cost: Math.round(items.reduce((sum, i) => sum + i.estimated_cost, 0) * 100) / 100,
    }))
    .sort((a, b) => a.supplier_name.localeCompare(b.supplier_name));

  return {
    drafts,
    unassigned_items: unassigned,
    generated_at: new Date().toISOString(),
    parameters: { lookback_days, lead_time_days, safety_buffer_pct },
    coverage: {
      total_inventory: inventory.length,
      items_with_usage: itemsWithUsage,
      items_needing_reorder: reorderItems.length,
    },
  };
}

// --- WhatsApp text export ---

export function formatWhatsApp(result: SuggestResult): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const lines: string[] = [];
  lines.push(`COMMANDE SUGGEREE - ${dateStr}`);
  lines.push('');

  let grandTotal = 0;

  for (const draft of result.drafts) {
    lines.push(`--- Fournisseur: ${draft.supplier_name} ---`);
    for (const item of draft.items) {
      const stockInfo = `stock: ${item.current_stock}, besoin ${result.parameters.lead_time_days}j: ${item.forecast_usage}`;
      lines.push(`- ${item.name}: ${item.suggested_quantity} ${item.unit} (${stockInfo})`);
    }
    lines.push(`Total estime: ${formatDH(draft.total_estimated_cost)}`);
    lines.push('');
    grandTotal += draft.total_estimated_cost;
  }

  if (result.unassigned_items.length > 0) {
    lines.push('--- Non assigne ---');
    for (const item of result.unassigned_items) {
      lines.push(`- ${item.name}: ${item.suggested_quantity} ${item.unit}`);
    }
    const unassignedTotal = result.unassigned_items.reduce((sum, i) => sum + i.estimated_cost, 0);
    lines.push(`Total estime: ${formatDH(unassignedTotal)}`);
    lines.push('');
    grandTotal += unassignedTotal;
  }

  if (result.drafts.length === 0 && result.unassigned_items.length === 0) {
    lines.push('Aucun reapprovisionnement necessaire.');
    lines.push('');
  }

  lines.push(`TOTAL GENERAL: ${formatDH(grandTotal)}`);
  lines.push(`Genere le ${dateStr} ${timeStr}`);

  return lines.join('\n');
}

function formatDH(amount: number): string {
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} DH`;
}
