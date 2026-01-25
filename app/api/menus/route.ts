import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';

// GET - Fetch menus or menu details
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') || 'list';

    if (id) {
      // Get single menu with items
      const { data: menu, error } = await supabase
        .from('menus')
        .select(`
          *,
          items:menu_menu_items(
            id,
            display_order,
            price_override,
            menu_item:menu_items(
              id,
              name,
              name_fr,
              price,
              price_small,
              price_large,
              description,
              category_id,
              is_available,
              is_signature,
              image_url
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Sort items by display_order
      if (menu?.items) {
        menu.items.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
      }

      return NextResponse.json({ menu });
    }

    if (type === 'list') {
      // Get all menus with item count
      const { data: menus, error } = await supabase
        .from('menus')
        .select(`
          *,
          items:menu_menu_items(id)
        `)
        .order('display_order')
        .order('name');

      if (error) throw error;

      const menusWithCount = (menus || []).map(m => ({
        ...m,
        item_count: m.items?.length || 0,
        items: undefined
      }));

      return NextResponse.json({ menus: menusWithCount });
    }

    if (type === 'active') {
      // Get only active menus
      const { data: menus, error } = await supabase
        .from('menus')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return NextResponse.json({ menus });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Menus GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

// POST - Create menu or add item to menu
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { type, ...data } = body;

    if (type === 'menu') {
      const { data: result, error } = await supabase
        .from('menus')
        .insert({
          name: data.name,
          name_fr: data.name_fr || null,
          description: data.description || null,
          type: data.menu_type || 'standard',
          is_active: data.is_active ?? true,
          display_order: data.display_order || 0,
          valid_from: data.valid_from || null,
          valid_until: data.valid_until || null
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, menu: result });
    }

    if (type === 'add-item') {
      // Add single item to menu
      const { data: result, error } = await supabase
        .from('menu_menu_items')
        .insert({
          menu_id: data.menu_id,
          menu_item_id: data.menu_item_id,
          display_order: data.display_order || 0,
          price_override: data.price_override || null
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, item: result });
    }

    if (type === 'add-items') {
      // Add multiple items to menu
      const items = data.menu_item_ids.map((itemId: string, index: number) => ({
        menu_id: data.menu_id,
        menu_item_id: itemId,
        display_order: index
      }));

      const { error } = await supabase
        .from('menu_menu_items')
        .insert(items);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Menus POST error:', error);
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
  }
}

// PATCH - Update menu or menu item
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { type, id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    if (type === 'menu') {
      const { data: result, error } = await supabase
        .from('menus')
        .update({
          name: data.name,
          name_fr: data.name_fr,
          description: data.description,
          type: data.menu_type,
          is_active: data.is_active,
          display_order: data.display_order,
          valid_from: data.valid_from,
          valid_until: data.valid_until,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, menu: result });
    }

    if (type === 'menu-item') {
      // Update menu item link (display_order, price_override)
      const { data: result, error } = await supabase
        .from('menu_menu_items')
        .update({
          display_order: data.display_order,
          price_override: data.price_override
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, item: result });
    }

    if (type === 'reorder-items') {
      // Reorder items in menu
      const updates = data.items.map((item: { id: string; display_order: number }) =>
        supabase
          .from('menu_menu_items')
          .update({ display_order: item.display_order })
          .eq('id', item.id)
      );

      await Promise.all(updates);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Menus PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
  }
}

// DELETE - Remove menu or item from menu
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json({ error: 'Type and ID required' }, { status: 400 });
    }

    if (type === 'menu') {
      const { error } = await supabase
        .from('menus')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (type === 'menu-item') {
      // Remove item from menu
      const { error } = await supabase
        .from('menu_menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Menus DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
  }
}
