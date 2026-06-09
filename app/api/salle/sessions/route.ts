import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, enforce } from '@/lib/auth/supabase-server';

export async function GET(request: NextRequest) {
  const denied = await enforce('salle.read'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);

    const tableId = searchParams.get('table_id');
    const sessionId = searchParams.get('session_id');
    const waiterId = searchParams.get('waiter_id');
    const status = searchParams.get('status');

    if (sessionId) {
      const { data, error } = await supabase
        .from('table_sessions')
        .select('*, waiter:staff_members!table_sessions_waiter_id_fkey(id, first_name, last_name), table:tables!table_sessions_table_id_fkey(id, table_number, zone_id)')
        .eq('id', sessionId)
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ session: data });
    }

    let query = supabase
      .from('table_sessions')
      .select('*, waiter:staff_members!table_sessions_waiter_id_fkey(id, first_name, last_name)')
      .order('opened_at', { ascending: false });

    if (tableId) query = query.eq('table_id', tableId);
    if (waiterId) query = query.eq('waiter_id', waiterId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ sessions: data });
  } catch (error) {
    console.error('Sessions GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await enforce('salle.serve'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { table_id, guests_count, waiter_id } = body;

    if (!table_id || !waiter_id) {
      return NextResponse.json({ error: 'table_id and waiter_id required' }, { status: 400 });
    }

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('table_sessions')
      .insert({
        table_id,
        waiter_id,
        guests_count: guests_count || 1,
        status: 'active',
      })
      .select('*, waiter:staff_members!table_sessions_waiter_id_fkey(id, first_name, last_name)')
      .single();

    if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

    // Set table to occupied
    await supabase
      .from('tables')
      .update({ status: 'occupied' })
      .eq('id', table_id);

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Sessions POST error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const denied = await enforce('salle.serve'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { id, status, notes } = body;

    if (!id) return NextResponse.json({ error: 'Session ID required' }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    // Handle closing a session
    if (status === 'closed') {
      // Get all non-cancelled orders for this session
      const { data: orders } = await supabase
        .from('table_orders')
        .select('*')
        .eq('session_id', id)
        .neq('status', 'cancelled');

      const total = (orders || []).reduce((sum, o) => sum + (o.quantity * o.unit_price), 0);
      updates.total_amount = total;
      updates.closed_at = new Date().toISOString();

      // Get session to find table_id
      const { data: session } = await supabase
        .from('table_sessions')
        .select('table_id')
        .eq('id', id)
        .single();

      if (session) {
        // Set table to cleaning
        await supabase
          .from('tables')
          .update({ status: 'cleaning' })
          .eq('id', session.table_id);
      }

      // Write each order to sales_items for finance tracking
      if (orders && orders.length > 0) {
        // Get menu item names
        const menuItemIds = [...new Set(orders.map(o => o.menu_item_id))];
        const { data: menuItems } = await supabase
          .from('menu_items')
          .select('id, name_fr, name, category_id')
          .in('id', menuItemIds);

        const menuMap = new Map(((menuItems || []) as Array<Record<string, unknown>>).map(m => [m.id, m]));

        const salesItems = orders.map(order => {
          const menuItem = menuMap.get(order.menu_item_id);
          return {
            product_name: menuItem?.name_fr || menuItem?.name || 'Unknown',
            category: menuItem?.category_id || null,
            quantity: order.quantity,
            selling_price: order.unit_price * order.quantity,
            sale_date: new Date().toISOString().split('T')[0],
            sale_time: new Date().toISOString().split('T')[1].split('.')[0],
            dine_in: true,
            import_source: 'salle_service',
          };
        });

        await supabase.from('sales_items').insert(salesItems);
      }
    }

    // Handle billing - calculate total
    if (status === 'billed') {
      const { data: orders } = await supabase
        .from('table_orders')
        .select('*')
        .eq('session_id', id)
        .neq('status', 'cancelled');

      const total = (orders || []).reduce((sum, o) => sum + (o.quantity * o.unit_price), 0);
      updates.total_amount = total;
    }

    const { data, error } = await supabase
      .from('table_sessions')
      .update(updates)
      .eq('id', id)
      .select('*, waiter:staff_members!table_sessions_waiter_id_fkey(id, first_name, last_name)')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ session: data });
  } catch (error) {
    console.error('Sessions PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
