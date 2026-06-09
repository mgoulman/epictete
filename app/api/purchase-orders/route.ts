import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, enforce } from '@/lib/auth/supabase-server';

interface OrderItem {
  id?: string;
  inventory_item_id?: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  received_quantity?: number;
  // Override for the line: if null, the PO's main vendor_id is used
  vendor_id?: string | null;
}

// GET — list orders, optionally filtered by vendor or status
export async function GET(request: NextRequest) {
    const denied = await enforce('inventory.read'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const status = searchParams.get('status');
    const orderId = searchParams.get('id');

    // Single order with items
    if (orderId) {
      const { data: order, error } = await supabase
        .from('purchase_orders')
        .select('*, vendor:vendors(id, name), items:purchase_order_items(*)')
        .eq('id', orderId)
        .single();
      if (error) throw error;
      return NextResponse.json({ order });
    }

    // List orders
    let query = supabase
      .from('purchase_orders')
      .select('*, vendor:vendors(id, name), items:purchase_order_items(*)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (vendorId) query = query.eq('vendor_id', vendorId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ orders: data || [] });
  } catch (error) {
    console.error('Purchase orders GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

// POST — create order or validate (receive) an order
export async function POST(request: NextRequest) {
    const denied = await enforce('inventory.write'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { action } = body;

    // ─── Validate / Receive an order ─────────────────────────────────
    if (action === 'receive') {
      const { order_id, items: receivedItems, paid_amount } = body as {
        order_id: string;
        items: Array<{ id: string; received_quantity: number }>;
        paid_amount: number;
      };

      // Fetch the order
      const { data: order, error: oErr } = await supabase
        .from('purchase_orders')
        .select('*, items:purchase_order_items(*), vendor:vendors(id, name)')
        .eq('id', order_id)
        .single();
      if (oErr) throw oErr;
      if (!order || order.status === 'received') {
        return NextResponse.json({ error: 'Order not found or already received' }, { status: 400 });
      }

      const { data: { user } } = await supabase.auth.getUser();
      // Use the order date for movements, not today
      const orderDate = order.order_date || new Date().toISOString().split('T')[0];

      // Update received quantities on items
      for (const ri of receivedItems || []) {
        await supabase
          .from('purchase_order_items')
          .update({ received_quantity: ri.received_quantity })
          .eq('id', ri.id);
      }

      // Build movements from order items
      const orderItems = order.items || [];
      const movements: Array<Record<string, unknown>> = [];

      for (const oi of orderItems) {
        const receivedQty = receivedItems?.find((r: { id: string }) => r.id === oi.id)?.received_quantity ?? oi.quantity;
        if (receivedQty <= 0) continue;

        if (oi.inventory_item_id) {
          // Fetch current item
          const { data: invItem } = await supabase
            .from('inventory_items')
            .select('id, quantity, cost_per_unit')
            .eq('id', oi.inventory_item_id)
            .single();

          if (invItem) {
            const qtyBefore = Number(invItem.quantity) || 0;
            const qtyAfter = qtyBefore + receivedQty;
            const currentCost = Number(invItem.cost_per_unit) || 0;
            const weightedAvg = qtyAfter > 0
              ? (qtyBefore * currentCost + receivedQty * oi.unit_cost) / qtyAfter
              : oi.unit_cost;

            const { error: updateErr } = await supabase
              .from('inventory_items')
              .update({
                quantity: qtyAfter,
                cost_per_unit: Math.round(weightedAvg * 100) / 100,
                last_purchase_price: oi.unit_cost,
                updated_at: new Date().toISOString(),
              })
              .eq('id', oi.inventory_item_id);

            if (updateErr) console.error('Order item update error:', updateErr);

            movements.push({
              inventory_item_id: oi.inventory_item_id,
              movement_type: 'invoice_receive',
              quantity_change: receivedQty,
              quantity_before: qtyBefore,
              quantity_after: qtyAfter,
              unit_cost: oi.unit_cost,
              reference_type: 'daily_purchase',
              reference_id: orderDate,
              notes: `Commande #${order_id.slice(0, 8)} — ${order.vendor?.name || ''}`,
              created_by: user?.id || null,
              created_at: `${orderDate}T12:00:00`,
            });
          }
        }
      }

      if (movements.length > 0) {
        const { error: movErr } = await supabase
          .from('inventory_movements')
          .insert(movements);
        if (movErr) throw movErr;
      }

      // Split totals by EFFECTIVE vendor (per-line override, fall back to PO main vendor)
      // The PO total still equals the sum of all lines.
      const perVendor = new Map<string, number>();
      let totalAmount = 0;
      for (const oi of orderItems as Array<OrderItem & { id: string; vendor_id: string | null }>) {
        const rq = receivedItems?.find((r: { id: string }) => r.id === oi.id)?.received_quantity ?? oi.quantity;
        const lineTotal = rq * oi.unit_cost;
        if (lineTotal <= 0) continue;
        totalAmount += lineTotal;
        const effectiveVendor = oi.vendor_id || order.vendor_id;
        perVendor.set(effectiveVendor, (perVendor.get(effectiveVendor) || 0) + lineTotal);
      }

      const round2 = (n: number) => Math.round(n * 100) / 100;

      // One debt transaction per effective vendor
      for (const [vid, amount] of perVendor) {
        if (amount <= 0) continue;
        await supabase.from('vendor_transactions').insert({
          vendor_id: vid,
          type: 'debt',
          amount: round2(amount),
          description: `Commande #${order_id.slice(0, 8)} reçue`,
          date: orderDate,
          reference: `order_${order_id}`,
        });
      }

      // Allocate payment proportionally across vendors that received debt
      if (paid_amount > 0 && totalAmount > 0) {
        const cappedPayment = Math.min(paid_amount, totalAmount);
        for (const [vid, vendorTotal] of perVendor) {
          const share = round2((vendorTotal / totalAmount) * cappedPayment);
          if (share <= 0) continue;
          await supabase.from('vendor_transactions').insert({
            vendor_id: vid,
            type: 'payment',
            amount: share,
            description: `Paiement commande #${order_id.slice(0, 8)}`,
            date: orderDate,
            reference: `order_pay_${order_id}`,
          });
        }
      }

      // Update order status
      await supabase
        .from('purchase_orders')
        .update({
          status: 'received',
          total_amount: Math.round(totalAmount * 100) / 100,
          paid_amount: paid_amount || 0,
          received_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order_id);

      return NextResponse.json({ success: true });
    }

    // ─── Create a new order ──────────────────────────────────────────
    const { vendor_id, order_date, expected_date, notes, status: orderStatus, items } = body as {
      vendor_id: string;
      order_date?: string;
      expected_date?: string;
      notes?: string;
      status?: string;
      items: OrderItem[];
    };

    if (!vendor_id || !items || items.length === 0) {
      return NextResponse.json({ error: 'vendor_id and items required' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    const totalAmount = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);

    const { data: order, error: createErr } = await supabase
      .from('purchase_orders')
      .insert({
        vendor_id,
        order_date: order_date || new Date().toISOString().split('T')[0],
        expected_date: expected_date || null,
        notes: notes || null,
        status: orderStatus || 'pending',
        total_amount: Math.round(totalAmount * 100) / 100,
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (createErr) throw createErr;

    // Insert items — preserve any per-line vendor override; null = use PO main vendor
    const orderItems = items.map(i => ({
      order_id: order.id,
      inventory_item_id: i.inventory_item_id || null,
      product_name: i.product_name,
      quantity: i.quantity,
      unit: i.unit,
      unit_cost: i.unit_cost,
      vendor_id: i.vendor_id && i.vendor_id !== vendor_id ? i.vendor_id : null,
    }));

    const { error: itemsErr } = await supabase
      .from('purchase_order_items')
      .insert(orderItems);
    if (itemsErr) throw itemsErr;

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Purchase orders POST error:', error);
    return NextResponse.json({ error: 'Failed to process order' }, { status: 500 });
  }
}

// PATCH — update order details/status, or update a single line item
export async function PATCH(request: NextRequest) {
    const denied = await enforce('inventory.write'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();

    // Single line-item update: { item_id, ...updates }
    if (body.item_id) {
      const { item_id, ...updates } = body;
      // Allow only known item columns
      const allowed = ['vendor_id', 'quantity', 'unit_cost', 'unit', 'product_name', 'inventory_item_id', 'received_quantity'];
      const cleaned: Record<string, unknown> = {};
      for (const k of allowed) if (k in updates) cleaned[k] = updates[k];
      const { error } = await supabase
        .from('purchase_order_items')
        .update(cleaned)
        .eq('id', item_id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const { error } = await supabase
      .from('purchase_orders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Purchase orders PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

// DELETE — cancel/delete an order
export async function DELETE(request: NextRequest) {
    const denied = await enforce('inventory.write'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const { error } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Purchase orders DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
