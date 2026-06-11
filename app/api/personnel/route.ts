import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, enforce, getServerSession } from '@/lib/auth/supabase-server';

type SupabaseLike = Awaited<ReturnType<typeof createSupabaseServerClient>>;

// Create a login account (users + profile) for a staff member and link it via
// profile_id. Returns { userId } on success, or { error } message on failure.
async function createLinkedAccount(
  supabase: SupabaseLike,
  opts: { staffId: string; email: string; first_name?: unknown; last_name?: unknown; password: string; role_id?: string | null },
): Promise<{ userId?: string; error?: string }> {
  try {
    const { query } = await import('@/lib/db');
    // Prevent privilege escalation: only an admin may grant the admin role.
    let roleId = opts.role_id || null;
    if (roleId) {
      const { rows: rr } = await query<{ name: string }>('SELECT name FROM roles WHERE id = $1', [roleId]);
      if (rr[0]?.name === 'admin') {
        const session = await getServerSession();
        if (session?.role !== 'admin') roleId = null;
      }
    }
    const { rows } = await query<{ id: string }>(
      "INSERT INTO users (email, password_hash) VALUES ($1, crypt($2, gen_salt('bf'))) RETURNING id",
      [opts.email, opts.password]
    );
    const userId = rows[0].id;
    await supabase.from('profiles').insert({
      id: userId,
      email: opts.email,
      full_name: `${opts.first_name || ''} ${opts.last_name || ''}`.trim(),
      role_id: roleId,
      is_active: true,
    });
    await supabase.from('staff_members').update({ profile_id: userId }).eq('id', opts.staffId);
    return { userId };
  } catch (e) {
    const m = (e as Error).message;
    return { error: m.includes('duplicate') || m.includes('unique') ? 'Un compte existe déjà avec cet email.' : "Le compte n'a pas pu être créé." };
  }
}

// GET - Fetch staff members, types, or specific data
export async function GET(request: NextRequest) {
  const denied = await enforce('personnel.read'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'staff';

    if (type === 'types') {
      // Get staff types
      const { data, error } = await supabase
        .from('staff_types')
        .select('*')
        .order('name');

      if (error) throw error;
      return NextResponse.json({ types: data });
    }

    if (type === 'staff') {
      // Get staff members with their types
      const { data, error } = await supabase
        .from('staff_members')
        .select(`*, staff_type:staff_types(*)`)
        .order('first_name');

      if (error) throw error;
      return NextResponse.json({ staff: data });
    }

    if (type === 'profiles') {
      // Active user accounts, for linking a staff member to a login.
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;
      return NextResponse.json({ profiles: data });
    }

    if (type === 'roles') {
      // Roles, so the personnel form can assign one when creating an account.
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, display_name')
        .order('display_name', { ascending: true });

      if (error) throw error;
      return NextResponse.json({ roles: data });
    }

    if (type === 'schedules') {
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const staffId = searchParams.get('staffId');

      let query = supabase
        .from('schedules')
        .select(`*, staff:staff_members(id, first_name, last_name, staff_type:staff_types(*))`)
        .order('date')
        .order('start_time');

      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);
      if (staffId) query = query.eq('staff_id', staffId);

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ schedules: data });
    }

    if (type === 'time-off') {
      const staffId = searchParams.get('staffId');
      const status = searchParams.get('status');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      let query = supabase
        .from('time_off')
        .select(`*, staff:staff_members(id, first_name, last_name)`)
        .order('start_date', { ascending: false });

      if (staffId) query = query.eq('staff_id', staffId);
      if (status) query = query.eq('status', status);
      // Overlap filter: time-off that overlaps with the given date range
      if (startDate && endDate) {
        query = query.lte('start_date', endDate).gte('end_date', startDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ timeOff: data });
    }

    if (type === 'salary') {
      const staffId = searchParams.get('staffId');
      const year = searchParams.get('year');
      const month = searchParams.get('month');

      let query = supabase
        .from('salary_records')
        .select(`*, staff:staff_members(id, first_name, last_name, staff_type:staff_types(*))`)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (staffId) query = query.eq('staff_id', staffId);
      if (year) query = query.eq('year', parseInt(year));
      if (month) query = query.eq('month', parseInt(month));

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ salary: data });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Personnel GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

// POST - Create new records
export async function POST(request: NextRequest) {
  const denied = await enforce('personnel.write'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { type, ...data } = body;

    if (type === 'staff') {
      // Optional: also create a login account for this staff member.
      const { account, ...staffData } = data as { account?: { create?: boolean; password?: string; role_id?: string } } & Record<string, unknown>;

      const { data: result, error } = await supabase
        .from('staff_members')
        .insert(staffData)
        .select(`*, staff_type:staff_types(*)`)
        .single();

      if (error) throw error;

      let accountError: string | null = null;
      if (account?.create && staffData.email && account.password) {
        const r = await createLinkedAccount(supabase, {
          staffId: result.id, email: staffData.email as string,
          first_name: staffData.first_name, last_name: staffData.last_name,
          password: account.password, role_id: account.role_id,
        });
        accountError = r.error || null;
        if (r.userId) result.profile_id = r.userId;
      }

      return NextResponse.json({ success: true, staff: result, accountError });
    }

    if (type === 'staff-type') {
      const { data: result, error } = await supabase
        .from('staff_types')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, staffType: result });
    }

    if (type === 'schedule') {
      const { data: result, error } = await supabase
        .from('schedules')
        .insert(data)
        .select(`*, staff:staff_members(id, first_name, last_name)`)
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, schedule: result });
    }

    if (type === 'time-off') {
      const { time_off_type, ...timeOffData } = data;
      const { data: result, error } = await supabase
        .from('time_off')
        .insert({ ...timeOffData, type: time_off_type })
        .select(`*, staff:staff_members(id, first_name, last_name)`)
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, timeOff: result });
    }

    if (type === 'salary') {
      // Calculate total
      const total = (data.base_salary || 0) + (data.bonuses || 0) - (data.deductions || 0);
      const { data: result, error } = await supabase
        .from('salary_records')
        .insert({ ...data, total })
        .select(`*, staff:staff_members(id, first_name, last_name)`)
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, salary: result });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Personnel POST error:', error);
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
  }
}

// PATCH - Update records
export async function PATCH(request: NextRequest) {
  const denied = await enforce('personnel.write'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { type, id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    if (type === 'staff') {
      // Optional: also create a login account while editing (if not linked yet).
      const { account, ...staffData } = data as { account?: { create?: boolean; password?: string; role_id?: string } } & Record<string, unknown>;

      const { data: result, error } = await supabase
        .from('staff_members')
        .update(staffData)
        .eq('id', id)
        .select(`*, staff_type:staff_types(*)`)
        .single();

      if (error) throw error;

      let accountError: string | null = null;
      if (account?.create && staffData.email && account.password) {
        const r = await createLinkedAccount(supabase, {
          staffId: id, email: staffData.email as string,
          first_name: staffData.first_name, last_name: staffData.last_name,
          password: account.password, role_id: account.role_id,
        });
        accountError = r.error || null;
        if (r.userId) result.profile_id = r.userId;
      }

      return NextResponse.json({ success: true, staff: result, accountError });
    }

    if (type === 'staff-type') {
      const { data: result, error } = await supabase
        .from('staff_types')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, staffType: result });
    }

    if (type === 'schedule') {
      const { data: result, error } = await supabase
        .from('schedules')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, schedule: result });
    }

    if (type === 'time-off') {
      const { data: result, error } = await supabase
        .from('time_off')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, timeOff: result });
    }

    if (type === 'salary') {
      // Recalculate total if relevant fields changed
      if (data.base_salary !== undefined || data.bonuses !== undefined || data.deductions !== undefined) {
        const { data: existing } = await supabase
          .from('salary_records')
          .select('base_salary, bonuses, deductions')
          .eq('id', id)
          .single();

        if (existing) {
          const base = data.base_salary ?? existing.base_salary;
          const bonuses = data.bonuses ?? existing.bonuses;
          const deductions = data.deductions ?? existing.deductions;
          data.total = base + bonuses - deductions;
        }
      }

      const { data: result, error } = await supabase
        .from('salary_records')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, salary: result });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Personnel PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
  }
}

// DELETE - Remove records
export async function DELETE(request: NextRequest) {
  const denied = await enforce('personnel.write'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json({ error: 'Type and ID required' }, { status: 400 });
    }

    const tableMap: Record<string, string> = {
      'staff': 'staff_members',
      'staff-type': 'staff_types',
      'schedule': 'schedules',
      'time-off': 'time_off',
      'salary': 'salary_records'
    };

    const table = tableMap[type];
    if (!table) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Personnel DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
  }
}
