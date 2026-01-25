import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';

// GET - Fetch all menu items
export async function GET(request: NextRequest) {
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
