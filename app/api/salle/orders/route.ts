import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('table_orders')
      .select('*, menu_item:menu_items!table_orders_menu_item_id_fkey(id, name, name_fr, price, category_id, image_url)')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ orders: data });
  } catch (error) {
    console.error('Orders GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { session_id, menu_item_id, quantity, notes } = body;

    if (!session_id || !menu_item_id) {
      return NextResponse.json({ error: 'session_id and menu_item_id required' }, { status: 400 });
    }

    // Get the menu item price
    const { data: menuItem, error: menuError } = await supabase
      .from('menu_items')
      .select('price')
      .eq('id', menu_item_id)
      .single();

    if (menuError || !menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('table_orders')
      .insert({
        session_id,
        menu_item_id,
        quantity: quantity || 1,
        unit_price: menuItem.price,
        notes: notes || null,
        status: 'ordered',
      })
      .select('*, menu_item:menu_items!table_orders_menu_item_id_fkey(id, name, name_fr, price, category_id, image_url)')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ order: data });
  } catch (error) {
    console.error('Orders POST error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { id, status, quantity, notes } = body;

    if (!id) return NextResponse.json({ error: 'Order ID required' }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (quantity !== undefined) updates.quantity = quantity;
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabase
      .from('table_orders')
      .update(updates)
      .eq('id', id)
      .select('*, menu_item:menu_items!table_orders_menu_item_id_fkey(id, name, name_fr, price, category_id, image_url)')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ order: data });
  } catch (error) {
    console.error('Orders PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Order ID required' }, { status: 400 });

    // Only allow deletion of orders with 'ordered' status
    const { data: order } = await supabase
      .from('table_orders')
      .select('status')
      .eq('id', id)
      .single();

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.status !== 'ordered') {
      return NextResponse.json({ error: 'Can only delete orders with status "ordered"' }, { status: 400 });
    }

    const { error } = await supabase.from('table_orders').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Orders DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}
