import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, enforce, getCurrentUserId } from '@/lib/auth/supabase-server';
import { createAuditLog } from '@/lib/auth/audit';

// GET - Fetch all menu items
export async function GET(request: NextRequest) {
  const denied = await enforce('menu.read'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const available = searchParams.get('available');

    let query = supabase
      .from('menu_items')
      .select('id, name, name_fr, price, price_small, price_large, description, category_id, is_available, is_signature, image_url')
      .order('name');

    if (available === 'true') {
      query = query.eq('is_available', true);
    }

    const { data: items, error } = await query;

    if (error) throw error;
    return NextResponse.json({ items: items || [] });
  } catch (error) {
    console.error('Menu items GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

// PATCH - Update a menu item's image_url
export async function PATCH(request: NextRequest) {
  const denied = await enforce('menu.write'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const userId = await getCurrentUserId();
    const { id, image_url } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing menu item id' }, { status: 400 });
    }

    const { error } = await supabase
      .from('menu_items')
      .update({ image_url: image_url ?? null, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    await createAuditLog({ userId, action: 'update', resourceType: 'menu_item', resourceId: String(id), newValues: { id, image_url: image_url ?? null } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Menu items PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}
