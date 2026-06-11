import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, enforce, getServerSession } from '@/lib/auth/supabase-server';
import { applyDailyPurchase, type DailyPurchaseBody } from '@/lib/inventory-actions';
import { approvalRequiredFor, submitApprovalRequest } from '@/lib/approvals';

// POST — batch-save daily purchases: update quantities + create movements.
// Subject to the inventory approval rule: requester roles get held for review.
export async function POST(request: NextRequest) {
    const denied = await enforce('inventory.write'); if (denied) return denied;
  try {
    const session = (await getServerSession())!; // enforce() guarantees a session
    const supabase = await createSupabaseServerClient();
    const body = await request.json() as DailyPurchaseBody;
    const { items, date } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items array is required' }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    // Approval gate: an achat touches both inventory and finance, so hold it if
    // EITHER module's approval rule applies to this user.
    let approvalModule = 'inventory';
    let rule = await approvalRequiredFor('inventory', session);
    if (!rule) { rule = await approvalRequiredFor('finance', session); approvalModule = 'finance'; }
    if (rule) {
      await submitApprovalRequest({
        module: approvalModule,
        action: 'inventory_daily_purchase',
        payload: { body, userId: session.id },
        summary: `Achat du ${date} — ${items.length} produit(s)`,
        session,
        rule,
      });
      return NextResponse.json({ pending: true, message: "Soumis pour approbation" });
    }

    const count = await applyDailyPurchase(supabase, body, session.id);
    return NextResponse.json({ success: true, count });
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
