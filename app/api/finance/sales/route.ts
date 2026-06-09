import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, enforce } from '@/lib/auth/supabase-server';

export async function GET(request: NextRequest) {
    const denied = await enforce('finance.read'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');
    const product = searchParams.get('product');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('sales_items')
      .select('*', { count: 'exact' })
      .order('sale_date', { ascending: false })
      .order('sale_time', { ascending: false });

    if (startDate) {
      query = query.gte('sale_date', startDate);
    }
    if (endDate) {
      query = query.lte('sale_date', endDate);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (product) {
      query = query.ilike('product_name', `%${product}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      items: data,
      total: count,
      limit,
      offset
    });
  } catch (error) {
    console.error('Sales fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch sales data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
    const denied = await enforce('finance.write'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();

    const item = {
      ticket_number: body.ticket_number || null,
      family: body.family || null,
      category: body.category || null,
      product_name: body.product_name,
      sub_product: body.sub_product || null,
      quantity: body.quantity || 1,
      catalog_price: body.catalog_price || 0,
      selling_price: body.selling_price || 0,
      tax_rate: body.tax_rate || 10,
      profit: body.profit || (body.selling_price - (body.purchase_price_ttc || 0)),
      dine_in: body.dine_in !== false,
      sale_date: body.sale_date || new Date().toISOString().split('T')[0],
      sale_time: body.sale_time || new Date().toTimeString().split(' ')[0]
    };

    const { data, error } = await supabase
      .from('sales_items')
      .insert(item)
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: data });
  } catch (error) {
    console.error('Sales insert error:', error);
    return NextResponse.json({ error: 'Failed to add sale' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
    const denied = await enforce('finance.write'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('sales_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
