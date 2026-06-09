import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, enforce } from '@/lib/auth/supabase-server';

// POST — quick-reserve a table { table_id, reserved_name, reserved_time, reserved_guests }
export async function POST(request: NextRequest) {
  const denied = await enforce('salle.serve'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const { table_id, reserved_name, reserved_time, reserved_guests } = await request.json();
    if (!table_id) return NextResponse.json({ error: 'table_id required' }, { status: 400 });

    const { data, error } = await supabase
      .from('tables')
      .update({
        status: 'reserved',
        reserved_name: reserved_name || null,
        reserved_time: reserved_time || null,
        reserved_guests: reserved_guests || null,
      })
      .eq('id', table_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ table: data });
  } catch (error) {
    console.error('Reserve error:', error);
    return NextResponse.json({ error: 'Failed to reserve' }, { status: 500 });
  }
}

// DELETE — release a reservation ?id=<table_id>
export async function DELETE(request: NextRequest) {
  const denied = await enforce('salle.serve'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await supabase
      .from('tables')
      .update({ status: 'available', reserved_name: null, reserved_time: null, reserved_guests: null })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Release error:', error);
    return NextResponse.json({ error: 'Failed to release' }, { status: 500 });
  }
}
