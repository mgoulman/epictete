import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, enforce } from '@/lib/auth/supabase-server';

// Staff lookup, kept after the Personnel feature was removed because the
// Reports payroll tab reads the active staff list (?type=staff) to populate its
// employee dropdown. Read-only; staff management now lives in Odoo.
export async function GET(request: NextRequest) {
  const denied = await enforce('personnel.read'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'staff';

    if (type === 'types') {
      const { data, error } = await supabase
        .from('staff_types')
        .select('*')
        .order('name');
      if (error) throw error;
      return NextResponse.json({ types: data });
    }

    if (type === 'staff') {
      const { data, error } = await supabase
        .from('staff_members')
        .select(`*, staff_type:staff_types(*)`)
        .order('first_name');
      if (error) throw error;
      return NextResponse.json({ staff: data });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Personnel GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
