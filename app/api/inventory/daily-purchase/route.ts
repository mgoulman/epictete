import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, enforce } from '@/lib/auth/supabase-server';

interface PurchaseLine {
  inventory_item_id: string;
  quantity: number;
  unit_cost: number;
  notes?: string;
  pack_size?: number;
}

// POST — batch-save daily purchases: update quantities + create movements
export async function POST(request: NextRequest) {
    const denied = await enforce('inventory.write'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { items, date }: { items: PurchaseLine[]; date: string } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items array is required' }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch current state of all items in one query
    const itemIds = items.map(i => i.inventory_item_id);
    const { data: currentItems, error: fetchError } = await supabase
      .from('inventory_items')
      .select('id, quantity, cost_per_unit, last_purchase_price, name')
      .in('id', itemIds);

    if (fetchError) throw fetchError;

    const currentMap = new Map(
      ((currentItems || []) as Array<Record<string, unknown>>).map(item => [item.id, item])
    );

    const newMovements: Array<Record<string, unknown>> = [];
    let processedCount = 0;

    for (const line of items) {
      const current = currentMap.get(line.inventory_item_id);
      if (!current) continue;

      // Check if a movement already exists for this product on this date
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
        // UPDATE existing movement — adjust inventory by the delta
        const oldQty = Number(existing.quantity_change) || 0;
        const qtyDelta = line.quantity - oldQty;
        const quantityAfter = quantityBefore + qtyDelta;

        const weightedAvgCost = quantityAfter > 0
          ? (quantityBefore * currentCost - oldQty * currentCost + line.quantity * line.unit_cost) / quantityAfter
          : line.unit_cost;

        // Update the movement
        await supabase.from('inventory_movements').update({
          quantity_change: line.quantity,
          quantity_after: quantityAfter,
          unit_cost: line.unit_cost,
          notes: line.notes || `Achat du ${date}`,
        }).eq('id', existing.id);

        // Update inventory item
        const updateFields: Record<string, unknown> = {
          quantity: Math.max(0, quantityAfter),
          cost_per_unit: Math.round(weightedAvgCost * 100) / 100,
          last_purchase_price: line.unit_cost,
          updated_at: new Date().toISOString(),
        };
        if (line.pack_size && line.pack_size > 1) updateFields.pack_size = line.pack_size;
        await supabase.from('inventory_items').update(updateFields).eq('id', line.inventory_item_id);
      } else {
        // INSERT new movement
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
          created_by: user?.id || null,
          created_at: `${date}T12:00:00`,
        });
      }
      processedCount++;
    }

    // Insert only new movements
    if (newMovements.length > 0) {
      const { error: movError } = await supabase
        .from('inventory_movements')
        .insert(newMovements);
      if (movError) throw movError;
    }

    return NextResponse.json({
      success: true,
      count: processedCount,
    });
  } catch (error) {
    console.error('Daily purchase error:', error);
    return NextResponse.json({ error: 'Failed to save purchases' }, { status: 500 });
  }
}

// PATCH — edit a movement's quantity/price and adjust inventory
export async function PATCH(request: NextRequest) {
    const denied = await enforce('inventory.write'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const { id, quantity, unit_cost } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    // Fetch current movement
    const { data: mov, error: movErr } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('id', id)
      .single();
    if (movErr || !mov) return NextResponse.json({ error: 'Movement not found' }, { status: 404 });

    const oldQty = Math.abs(Number(mov.quantity_change));
    const isUsage = Number(mov.quantity_change) < 0;
    const newQtyChange = isUsage ? -quantity : quantity;
    const qtyDelta = quantity - oldQty;

    // Update the movement
    await supabase.from('inventory_movements').update({
      quantity_change: newQtyChange,
      unit_cost,
      quantity_after: Number(mov.quantity_before) + newQtyChange,
    }).eq('id', id);

    // Adjust inventory item quantity
    const { data: item } = await supabase
      .from('inventory_items')
      .select('quantity')
      .eq('id', mov.inventory_item_id)
      .single();

    if (item) {
      const currentQty = Number(item.quantity) || 0;
      const adjustment = isUsage ? -qtyDelta : qtyDelta;
      const { error: updateErr } = await supabase.from('inventory_items').update({
        quantity: Math.max(0, currentQty + adjustment),
        updated_at: new Date().toISOString(),
      }).eq('id', mov.inventory_item_id);
      if (updateErr) console.error('Item update error:', updateErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Movement edit error:', error);
    return NextResponse.json({ error: 'Failed to edit' }, { status: 500 });
  }
}

// GET — fetch purchase history grouped by date
export async function GET(request: NextRequest) {
    const denied = await enforce('inventory.read'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const itemId = searchParams.get('itemId');

    let query = supabase
      .from('inventory_movements')
      .select('*, inventory_item:inventory_items(id, name, unit)')
      .eq('reference_type', 'daily_purchase')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (startDate) query = query.gte('created_at', `${startDate}T00:00:00`);
    if (endDate) query = query.lte('created_at', `${endDate}T23:59:59`);
    if (itemId) query = query.eq('inventory_item_id', itemId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ movements: data || [] });
  } catch (error) {
    console.error('Daily purchase history error:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

// DELETE — revert movements and restore quantities
// Supports: ?id=<movement_id> for single item, or ?date=<date>&type=<ref_type> for full day
export async function DELETE(request: NextRequest) {
    const denied = await enforce('inventory.write'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const singleId = searchParams.get('id');
    const date = searchParams.get('date');
    const refType = searchParams.get('type') || 'daily_purchase';

    let movements: Array<{ id: string; inventory_item_id: string; quantity_change: number }> = [];

    if (singleId) {
      // Delete a single movement
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('id, inventory_item_id, quantity_change')
        .eq('id', singleId)
        .single();
      if (error) throw error;
      if (data) movements = [data];
    } else if (date) {
      // Delete all movements for a date
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('id, inventory_item_id, quantity_change')
        .eq('reference_type', refType)
        .eq('reference_id', date);
      if (error) throw error;
      movements = data || [];
    } else {
      return NextResponse.json({ error: 'id or date is required' }, { status: 400 });
    }

    if (movements.length === 0) {
      return NextResponse.json({ error: 'No movements found' }, { status: 404 });
    }

    // Revert each item's quantity
    for (const m of movements) {
      const { data: item } = await supabase
        .from('inventory_items')
        .select('quantity')
        .eq('id', m.inventory_item_id)
        .single();

      if (item) {
        const currentQty = Number(item.quantity) || 0;
        const revertedQty = Math.max(0, currentQty - m.quantity_change);
        await supabase
          .from('inventory_items')
          .update({ quantity: revertedQty, updated_at: new Date().toISOString() })
          .eq('id', m.inventory_item_id);
      }
    }

    // Delete the movements
    const ids = movements.map(m => m.id);
    const { error: delError } = await supabase
      .from('inventory_movements')
      .delete()
      .in('id', ids);

    if (delError) throw delError;

    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error) {
    console.error('Daily purchase delete error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
