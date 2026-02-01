import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const lowStock = searchParams.get('lowStock');

    let query = supabase
      .from('inventory_items')
      .select('*, vendor:vendors(id, name)')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    if (lowStock === 'true') {
      query = query.filter('quantity', 'lte', 'minimum_stock');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Inventory fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get categories for filter
    const { data: categories } = await supabase
      .from('inventory_items')
      .select('category')
      .not('category', 'is', null);

    const uniqueCategories = Array.from(new Set((categories || []).map(c => c.category))).filter(Boolean);

    return NextResponse.json({
      items: data || [],
      categories: uniqueCategories
    });
  } catch (error) {
    console.error('Inventory error:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();

    const vendorId = body.vendor_id || null;

    // Auto-sync supplier text from vendor name for backward compatibility
    let supplierName = body.supplier || null;
    if (vendorId) {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('name')
        .eq('id', vendorId)
        .single();
      if (vendor) {
        supplierName = vendor.name;
      }
    }

    const item = {
      name: body.name,
      category: body.category || null,
      quantity: body.quantity || 0,
      unit: body.unit || 'pieces',
      minimum_stock: body.minimum_stock || 0,
      cost_per_unit: body.cost_per_unit || 0,
      vendor_id: vendorId,
      supplier: supplierName,
      notes: body.notes || null
    };

    if (!item.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('inventory_items')
      .insert(item)
      .select('*, vendor:vendors(id, name)')
      .single();

    if (error) {
      console.error('Inventory insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: data });
  } catch (error) {
    console.error('Inventory create error:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Auto-sync supplier text when vendor_id is updated
    if ('vendor_id' in updates) {
      if (updates.vendor_id) {
        const { data: vendor } = await supabase
          .from('vendors')
          .select('name')
          .eq('id', updates.vendor_id)
          .single();
        if (vendor) {
          updates.supplier = vendor.name;
        }
      } else {
        updates.supplier = null;
      }
    }

    const { data, error } = await supabase
      .from('inventory_items')
      .update(updates)
      .eq('id', id)
      .select('*, vendor:vendors(id, name)')
      .single();

    if (error) {
      console.error('Inventory update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: data });
  } catch (error) {
    console.error('Inventory update error:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Inventory delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Inventory delete error:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
