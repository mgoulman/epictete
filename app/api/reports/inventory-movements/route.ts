import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const itemId = searchParams.get('itemId');
    const movementType = searchParams.get('type');

    let query = supabase
      .from('inventory_movements')
      .select('*, inventory_item:inventory_items(id, name, unit)')
      .order('created_at', { ascending: false })
      .limit(500);

    if (startDate) query = query.gte('created_at', `${startDate}T00:00:00`);
    if (endDate) query = query.lte('created_at', `${endDate}T23:59:59`);
    if (itemId) query = query.eq('inventory_item_id', itemId);
    if (movementType) query = query.eq('movement_type', movementType);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ movements: data || [] });
  } catch (error) {
    console.error('Inventory movements GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch movements' }, { status: 500 });
  }
}
