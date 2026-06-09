import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, enforce } from '@/lib/auth/supabase-server';

export async function GET(request: NextRequest) {
  const denied = await enforce('salle.read'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'zones') {
      const { data, error } = await supabase
        .from('floor_zones')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ zones: data });
    }

    if (type === 'tables') {
      const zoneId = searchParams.get('zone_id');
      let query = supabase
        .from('tables')
        .select('*, assigned_waiter:staff_members!tables_assigned_waiter_id_fkey(id, first_name, last_name)')
        .order('table_number', { ascending: true });

      if (zoneId) {
        query = query.eq('zone_id', zoneId);
      }

      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ tables: data });
    }

    if (type === 'tables-with-sessions') {
      const zoneId = searchParams.get('zone_id');
      let query = supabase
        .from('tables')
        .select('*, assigned_waiter:staff_members!tables_assigned_waiter_id_fkey(id, first_name, last_name)')
        .order('table_number', { ascending: true });

      if (zoneId) {
        query = query.eq('zone_id', zoneId);
      }

      const { data: tables, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Fetch active sessions for occupied tables
      const occupiedTableIds = (tables || [])
        .filter(t => t.status === 'occupied')
        .map(t => t.id);

      let sessions: Record<string, unknown>[] = [];
      if (occupiedTableIds.length > 0) {
        const { data: sessionsData } = await supabase
          .from('table_sessions')
          .select('*, waiter:staff_members!table_sessions_waiter_id_fkey(id, first_name, last_name)')
          .in('table_id', occupiedTableIds)
          .in('status', ['active', 'served', 'billed'])
          .order('opened_at', { ascending: false });
        sessions = sessionsData || [];
      }

      const tablesWithSessions = (tables || []).map(table => ({
        ...table,
        active_session: sessions.find((s: Record<string, unknown>) => s.table_id === table.id) || null,
      }));

      return NextResponse.json({ tables: tablesWithSessions });
    }

    if (type === 'menu-categories') {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('id, name, name_fr')
        .order('sort_order', { ascending: true });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ categories: data });
    }

    if (type === 'available-profiles') {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ profiles: data });
    }

    if (type === 'staff') {
      const { data, error } = await supabase
        .from('staff_members')
        .select('id, first_name, last_name, is_active')
        .eq('is_active', true)
        .order('first_name', { ascending: true });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ staff: data });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error) {
    console.error('Salle GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await enforce('salle.write'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { type } = body;

    if (type === 'zone') {
      const { data, error } = await supabase
        .from('floor_zones')
        .insert({ name: body.name, sort_order: body.sort_order || 0 })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ zone: data });
    }

    if (type === 'table') {
      const { data, error } = await supabase
        .from('tables')
        .insert({
          zone_id: body.zone_id,
          table_number: body.table_number,
          seats: body.seats || 4,
          shape: body.shape || 'round',
          x: body.x || 50,
          y: body.y || 50,
          width: body.width || 10,
          height: body.height || 10,
          assigned_waiter_id: body.assigned_waiter_id || null,
        })
        .select('*, assigned_waiter:staff_members!tables_assigned_waiter_id_fkey(id, first_name, last_name)')
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ table: data });
    }

    if (type === 'tables-bulk') {
      const { tables } = body;
      if (!Array.isArray(tables)) {
        return NextResponse.json({ error: 'tables array required' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('tables')
        .upsert(tables, { onConflict: 'id' })
        .select('*, assigned_waiter:staff_members!tables_assigned_waiter_id_fkey(id, first_name, last_name)');

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ tables: data });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Salle POST error:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const denied = await enforce('salle.write'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { type } = body;

    if (type === 'zone') {
      const { id, ...updates } = body;
      delete updates.type;
      const { data, error } = await supabase
        .from('floor_zones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ zone: data });
    }

    if (type === 'table') {
      const { id, ...updates } = body;
      delete updates.type;
      const { data, error } = await supabase
        .from('tables')
        .update(updates)
        .eq('id', id)
        .select('*, assigned_waiter:staff_members!tables_assigned_waiter_id_fkey(id, first_name, last_name)')
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ table: data });
    }

    if (type === 'tables-positions') {
      const { positions } = body; // [{id, x, y, width?, height?, rotation?}]
      if (!Array.isArray(positions)) {
        return NextResponse.json({ error: 'positions array required' }, { status: 400 });
      }

      const results: Array<{ id: string; error: string }> = [];
      for (const pos of positions) {
        const updates: Record<string, number> = { x: pos.x, y: pos.y };
        if (pos.width !== undefined) updates.width = pos.width;
        if (pos.height !== undefined) updates.height = pos.height;
        if (pos.rotation !== undefined) updates.rotation = pos.rotation;

        const { error } = await supabase
          .from('tables')
          .update(updates)
          .eq('id', pos.id);
        if (error) results.push({ id: pos.id, error: error.message });
      }

      if (results.length > 0) {
        return NextResponse.json({ error: 'Some updates failed', details: results }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (type === 'table-status') {
      const { id, status } = body;
      const { data, error } = await supabase
        .from('tables')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ table: data });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Salle PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const denied = await enforce('salle.write'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    if (type === 'zone') {
      const { error } = await supabase.from('floor_zones').delete().eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (type === 'table') {
      const { error } = await supabase.from('tables').delete().eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Salle DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
