import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';

interface UsageLine {
  inventory_item_id: string;
  quantity: number;
  reason?: string;
  notes?: string;
}

// POST — batch-save daily stock outgoing: subtract quantities + create movements
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { items, date }: { items: UsageLine[]; date: string } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items array is required' }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    // Fetch current state of all items
    const itemIds = items.map(i => i.inventory_item_id);
    const { data: currentItems, error: fetchError } = await supabase
      .from('inventory_items')
      .select('id, quantity, cost_per_unit, name')
      .in('id', itemIds);

    if (fetchError) throw fetchError;

    const currentMap = new Map(
      ((currentItems || []) as Array<Record<string, unknown>>).map(item => [item.id, item])
    );

    const movements: Array<Record<string, unknown>> = [];

    for (const line of items) {
      const current = currentMap.get(line.inventory_item_id);
      if (!current) continue;

      const quantityBefore = Number(current.quantity) || 0;
      const quantityAfter = Math.max(0, quantityBefore - line.quantity);
      const unitCost = Number(current.cost_per_unit) || 0;

      // Determine movement_type from reason
      const movementType = line.reason === 'waste' ? 'waste'
        : line.reason === 'sale' ? 'sale_deduction'
        : 'manual_subtract';

      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          quantity: quantityAfter,
          updated_at: new Date().toISOString(),
        })
        .eq('id', line.inventory_item_id);

      if (updateError) {
        console.error('Item update error:', updateError);
      }

      movements.push({
        inventory_item_id: line.inventory_item_id,
        movement_type: movementType,
        quantity_change: -line.quantity,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        unit_cost: unitCost,
        reference_type: 'daily_usage',
        reference_id: date,
        notes: line.notes || `Sortie du ${date}`,
        created_by: user?.id || null,
        created_at: `${date}T12:00:00`,
      });
    }

    if (movements.length > 0) {
      const { error: movError } = await supabase
        .from('inventory_movements')
        .insert(movements);
      if (movError) throw movError;
    }

    return NextResponse.json({
      success: true,
      count: movements.length,
    });
  } catch (error) {
    console.error('Daily usage error:', error);
    return NextResponse.json({ error: 'Failed to save usage' }, { status: 500 });
  }
}

// GET — fetch usage history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const itemId = searchParams.get('itemId');

    let query = supabase
      .from('inventory_movements')
      .select('*, inventory_item:inventory_items(id, name, unit)')
      .eq('reference_type', 'daily_usage')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (startDate) query = query.gte('created_at', `${startDate}T00:00:00`);
    if (endDate) query = query.lte('created_at', `${endDate}T23:59:59`);
    if (itemId) query = query.eq('inventory_item_id', itemId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ movements: data || [] });
  } catch (error) {
    console.error('Daily usage history error:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
