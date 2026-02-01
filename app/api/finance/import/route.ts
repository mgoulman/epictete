import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import * as XLSX from 'xlsx';

interface SalesRow {
  'Id commande'?: string;
  'N° commande canal'?: string;
  'Canal de vente'?: string;
  'Caisse'?: string;
  'Nom caissier'?: string;
  'Serveur'?: string;
  'Date'?: string;
  'Heure'?: string;
  'Num ticket'?: string;
  'Titre ticket'?: string;
  'Famille'?: string;
  'Categorie'?: string;
  'Produit'?: string;
  'Sous produit'?: string;
  'Code barre'?: string;
  'Type'?: string;
  'Prix achat HT'?: number;
  'Prix achat TTC'?: number;
  'Quantité'?: number;
  'Prix catalogue'?: number;
  'Prix de vente'?: number;
  'TVA'?: number;
  'Bénéfice'?: number;
  'SurPlace'?: string;
  'NomClient'?: string;
  'PrénomClient'?: string;
  'TelClient'?: string;
  'Moyens de paiements'?: string;
  'Type de vente'?: string;
  'Fournisseur'?: string;
  'Id déclinaison'?: string;
}

function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  // Handle format YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return dateStr;
  }
  return null;
}

function parseTime(timeStr: string | undefined): string | null {
  if (!timeStr) return null;
  // Handle format HH:MM or HH:M
  if (timeStr.includes(':')) {
    const [h, m] = timeStr.split(':');
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`;
  }
  return null;
}

// Helper to get value from row with flexible column matching
function getColumnValue(row: Record<string, unknown>, possibleNames: string[]): unknown {
  for (const name of possibleNames) {
    // Try exact match first
    if (row[name] !== undefined) return row[name];
    // Try case-insensitive match
    const lowerName = name.toLowerCase();
    for (const key of Object.keys(row)) {
      if (key.toLowerCase() === lowerName || key.toLowerCase().trim() === lowerName) {
        return row[key];
      }
    }
  }
  return undefined;
}

function getStringValue(row: Record<string, unknown>, possibleNames: string[]): string | null {
  const val = getColumnValue(row, possibleNames);
  return val != null ? String(val) : null;
}

function getNumberValue(row: Record<string, unknown>, possibleNames: string[], defaultVal = 0): number {
  const val = getColumnValue(row, possibleNames);
  if (val == null) return defaultVal;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
  return isNaN(num) ? defaultVal : num;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: SalesRow[] = XLSX.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      return NextResponse.json({ error: 'No data found in file' }, { status: 400 });
    }

    // Create import batch
    const { data: importBatch, error: importError } = await supabase
      .from('sales_imports')
      .insert({
        filename: file.name,
        records_count: data.length,
        status: 'processing'
      })
      .select()
      .single();

    if (importError) {
      console.error('Import batch error:', importError);
      return NextResponse.json({ error: 'Failed to create import batch' }, { status: 500 });
    }

    // Process data with flexible column matching
    let totalAmount = 0;
    let minDate: string | null = null;
    let maxDate: string | null = null;

    // Insert sales items (we'll store items directly for simplicity)
    const salesItems = data.map(row => {
      const rowData = row as Record<string, unknown>;

      const sellingPrice = getNumberValue(rowData, ['Prix de vente', 'Prix vente', 'prix de vente', 'PrixVente']);
      const quantity = getNumberValue(rowData, ['Quantité', 'Quantite', 'quantité', 'Qté', 'Qty'], 1);
      const saleDate = parseDate(getStringValue(rowData, ['Date', 'date']) || undefined);

      // Calculate totals
      totalAmount += sellingPrice * quantity;

      if (saleDate) {
        if (!minDate || saleDate < minDate) minDate = saleDate;
        if (!maxDate || saleDate > maxDate) maxDate = saleDate;
      }

      return {
        ticket_number: getStringValue(rowData, ['Num ticket', 'N° ticket', 'Ticket', 'NumTicket']),
        family: getStringValue(rowData, ['Famille', 'famille', 'Family']),
        category: getStringValue(rowData, ['Categorie', 'Catégorie', 'categorie', 'Category']),
        product_name: getStringValue(rowData, ['Produit', 'produit', 'Product', 'Nom']) || 'Unknown',
        sub_product: getStringValue(rowData, ['Sous produit', 'SousProduit', 'sous produit']),
        barcode: getStringValue(rowData, ['Code barre', 'CodeBarre', 'Barcode']),
        item_type: getStringValue(rowData, ['Type', 'type']) || 'Aliments',
        purchase_price_ht: getNumberValue(rowData, ['Prix achat HT', 'PrixAchatHT', 'prix achat ht']),
        purchase_price_ttc: getNumberValue(rowData, ['Prix achat TTC', 'PrixAchatTTC', 'prix achat ttc']),
        quantity,
        catalog_price: getNumberValue(rowData, ['Prix catalogue', 'PrixCatalogue', 'prix catalogue']),
        selling_price: sellingPrice,
        tax_rate: getNumberValue(rowData, ['TVA', 'tva', 'Tax'], 10),
        profit: getNumberValue(rowData, ['Bénéfice', 'Benefice', 'bénéfice', 'Profit']),
        dine_in: getStringValue(rowData, ['SurPlace', 'Sur Place', 'surplace']) === 'Sur place',
        supplier: getStringValue(rowData, ['Fournisseur', 'fournisseur', 'Supplier']),
        sale_date: saleDate,
        sale_time: parseTime(getStringValue(rowData, ['Heure', 'heure', 'Time', 'Hour']) || undefined)
      };
    });

    // Insert in batches of 100
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < salesItems.length; i += batchSize) {
      const batch = salesItems.slice(i, i + batchSize);
      const { error: itemsError } = await supabase
        .from('sales_items')
        .insert(batch);

      if (itemsError) {
        console.error('Items insert error:', itemsError);
      } else {
        insertedCount += batch.length;
      }
    }

    // Update import batch with final stats
    await supabase
      .from('sales_imports')
      .update({
        records_count: insertedCount,
        total_amount: totalAmount,
        date_range_start: minDate,
        date_range_end: maxDate,
        status: 'completed'
      })
      .eq('id', importBatch.id);

    // --- Step 4: Inventory deduction via recipes ---
    const inventoryDeductions: Array<{ id: string; name: string; deducted: number; new_quantity: number }> = [];
    let unmatchedProducts: string[] = [];

    try {
      // 4a. Aggregate imported sales: normalize product_name → total quantity
      const salesAgg = new Map<string, number>();
      for (const item of salesItems) {
        // Sales product_name has trailing " - ", strip it
        const normalized = item.product_name
          .replace(/\s*-\s*$/, '')
          .trim()
          .toLowerCase();
        salesAgg.set(normalized, (salesAgg.get(normalized) || 0) + item.quantity);
      }

      // 4b. Fetch all menu items that have a recipe_id
      const { data: menuItemsWithRecipes } = await supabase
        .from('menu_items')
        .select('id, name, name_fr, recipe_id')
        .not('recipe_id', 'is', null);

      if (menuItemsWithRecipes && menuItemsWithRecipes.length > 0) {
        // Build lookup: normalized menu item name → menu item (with recipe_id)
        const menuLookup = new Map<string, { recipe_id: string }>();
        for (const mi of menuItemsWithRecipes) {
          menuLookup.set(mi.name.trim().toLowerCase(), { recipe_id: mi.recipe_id });
          if (mi.name_fr) {
            menuLookup.set(mi.name_fr.trim().toLowerCase(), { recipe_id: mi.recipe_id });
          }
        }

        // 4c. Match sales products to menu items, collect recipe IDs needed
        const recipeQuantities = new Map<string, number>(); // recipe_id → total sold
        const matchedProducts = new Set<string>();

        for (const [normalizedName, qty] of salesAgg) {
          const match = menuLookup.get(normalizedName);
          if (match) {
            matchedProducts.add(normalizedName);
            recipeQuantities.set(
              match.recipe_id,
              (recipeQuantities.get(match.recipe_id) || 0) + qty
            );
          }
        }

        // Track unmatched for response info
        for (const [name] of salesAgg) {
          if (!matchedProducts.has(name)) {
            unmatchedProducts.push(name);
          }
        }

        if (recipeQuantities.size > 0) {
          // 4d. Fetch recipes + ingredients for matched recipe IDs
          const recipeIds = Array.from(recipeQuantities.keys());
          const { data: recipes } = await supabase
            .from('recipes')
            .select('id, portions')
            .in('id', recipeIds);

          const { data: recipeIngredients } = await supabase
            .from('recipe_ingredients')
            .select('recipe_id, inventory_item_id, quantity')
            .in('recipe_id', recipeIds)
            .not('inventory_item_id', 'is', null);

          if (recipes && recipeIngredients) {
            // Build portions lookup
            const portionsMap = new Map<string, number>();
            for (const r of recipes) {
              portionsMap.set(r.id, r.portions || 1);
            }

            // 4e. Calculate deduction per inventory item
            const deductionMap = new Map<string, number>(); // inventory_item_id → total to deduct

            for (const ing of recipeIngredients) {
              const salesQty = recipeQuantities.get(ing.recipe_id) || 0;
              if (salesQty <= 0) continue;

              const portions = portionsMap.get(ing.recipe_id) || 1;
              // Each sale = 1 portion, so deduction = (ingredient.quantity / portions) * salesQty
              const deduction = (Number(ing.quantity) / portions) * salesQty;

              deductionMap.set(
                ing.inventory_item_id,
                (deductionMap.get(ing.inventory_item_id) || 0) + deduction
              );
            }

            // 4f. Batch-fetch current inventory quantities and apply deductions
            if (deductionMap.size > 0) {
              const inventoryIds = Array.from(deductionMap.keys());
              const { data: inventoryItems } = await supabase
                .from('inventory_items')
                .select('id, name, quantity')
                .in('id', inventoryIds);

              if (inventoryItems) {
                for (const inv of inventoryItems) {
                  const deduction = deductionMap.get(inv.id) || 0;
                  if (deduction <= 0) continue;

                  const currentQty = Number(inv.quantity);
                  const newQty = Math.max(0, currentQty - deduction);

                  const { error: updateErr } = await supabase
                    .from('inventory_items')
                    .update({
                      quantity: newQty,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', inv.id);

                  if (!updateErr) {
                    inventoryDeductions.push({
                      id: inv.id,
                      name: inv.name,
                      deducted: Math.round(deduction * 10000) / 10000,
                      new_quantity: Math.round(newQty * 10000) / 10000
                    });
                  }
                }
              }
            }
          }
        }
      }
    } catch (deductionError) {
      console.error('Inventory deduction error (non-fatal):', deductionError);
    }

    return NextResponse.json({
      success: true,
      importId: importBatch.id,
      recordsImported: insertedCount,
      totalAmount,
      dateRange: { start: minDate, end: maxDate },
      inventoryDeductions,
      unmatchedProducts: unmatchedProducts.slice(0, 20)
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
