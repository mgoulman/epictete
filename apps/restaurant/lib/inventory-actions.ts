// Reusable inventory write logic, shared by the API route and the approval
// executor (so a held "achat" can be replayed verbatim once approved).

import type { createSupabaseServerClient } from '@/lib/auth/supabase-server';

type SupabaseLike = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export interface PurchaseLine {
  inventory_item_id: string;
  quantity: number;
  unit_cost: number;
  notes?: string;
  pack_size?: number;
}

export interface DailyPurchaseBody {
  items: PurchaseLine[];
  date: string;
}

/**
 * Apply a batch of daily purchases: update item quantities/costs and record
 * movements. `userId` is the originator (the requester, even when replayed by
 * an approver). Returns the number of processed lines.
 */
export async function applyDailyPurchase(
  supabase: SupabaseLike,
  body: DailyPurchaseBody,
  userId: string | null,
): Promise<number> {
  const { items, date } = body;

  const itemIds = items.map(i => i.inventory_item_id);
  const { data: currentItems } = await supabase
    .from('inventory_items')
    .select('id, quantity, cost_per_unit, last_purchase_price, name')
    .in('id', itemIds);

  const currentMap = new Map(
    ((currentItems || []) as Array<Record<string, unknown>>).map(item => [item.id, item])
  );

  const newMovements: Array<Record<string, unknown>> = [];
  let processedCount = 0;

  for (const line of items) {
    const current = currentMap.get(line.inventory_item_id);
    if (!current) continue;

    const { data: existing } = await supabase
      .from('inventory_movements')
      .select('id, quantity_change')
      .eq('inventory_item_id', line.inventory_item_id)
      .eq('reference_type', 'daily_purchase')
      .eq('reference_id', date)
      .single();

    const quantityBefore = Number(current.quantity) || 0;
    const currentCost = Number(current.cost_per_unit) || 0;

    if (existing) {
      const oldQty = Number(existing.quantity_change) || 0;
      const qtyDelta = line.quantity - oldQty;
      const quantityAfter = quantityBefore + qtyDelta;

      const weightedAvgCost = quantityAfter > 0
        ? (quantityBefore * currentCost - oldQty * currentCost + line.quantity * line.unit_cost) / quantityAfter
        : line.unit_cost;

      await supabase.from('inventory_movements').update({
        quantity_change: line.quantity,
        quantity_after: quantityAfter,
        unit_cost: line.unit_cost,
        notes: line.notes || `Achat du ${date}`,
      }).eq('id', existing.id);

      const updateFields: Record<string, unknown> = {
        quantity: Math.max(0, quantityAfter),
        cost_per_unit: Math.round(weightedAvgCost * 100) / 100,
        last_purchase_price: line.unit_cost,
        updated_at: new Date().toISOString(),
      };
      if (line.pack_size && line.pack_size > 1) updateFields.pack_size = line.pack_size;
      await supabase.from('inventory_items').update(updateFields).eq('id', line.inventory_item_id);
    } else {
      const quantityAfter = quantityBefore + line.quantity;
      const weightedAvgCost = quantityAfter > 0
        ? (quantityBefore * currentCost + line.quantity * line.unit_cost) / quantityAfter
        : line.unit_cost;

      const updateFields: Record<string, unknown> = {
        quantity: quantityAfter,
        cost_per_unit: Math.round(weightedAvgCost * 100) / 100,
        last_purchase_price: line.unit_cost,
        updated_at: new Date().toISOString(),
      };
      if (line.pack_size && line.pack_size > 1) updateFields.pack_size = line.pack_size;
      await supabase.from('inventory_items').update(updateFields).eq('id', line.inventory_item_id);

      newMovements.push({
        inventory_item_id: line.inventory_item_id,
        movement_type: 'invoice_receive',
        quantity_change: line.quantity,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        unit_cost: line.unit_cost,
        reference_type: 'daily_purchase',
        reference_id: date,
        notes: line.notes || `Achat du ${date}`,
        created_by: userId,
        created_at: `${date}T12:00:00`,
      });
    }
    processedCount++;
  }

  if (newMovements.length > 0) {
    await supabase.from('inventory_movements').insert(newMovements);
  }

  return processedCount;
}
