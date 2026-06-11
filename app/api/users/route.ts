import { NextResponse } from 'next/server';
import { createSupabaseServerClient, requirePermission } from '@/lib/auth/supabase-server';
import { createAuditLog, getRequestMeta } from '@/lib/auth/audit';

// GET /api/users - List all users
export async function GET() {
  try {
    await requirePermission('users.manage');

    const supabase = await createSupabaseServerClient();

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`
        *,
        role:roles(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: profiles });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (err.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/users - Create a new user
export async function POST(request: Request) {
  try {
    const currentUser = await requirePermission('users.manage');

    const { email, password, full_name, role_id, is_active = true, create_staff = false } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Create user in local database
    const { query } = await import('@/lib/db');
    const { rows: newUsers } = await query(
      "INSERT INTO users (email, password_hash) VALUES ($1, crypt($2, gen_salt('bf'))) RETURNING id, email",
      [email, password]
    );

    if (newUsers.length === 0) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    const newUser = newUsers[0] as { id: string; email: string };

    // Create profile
    await supabase.from('profiles').insert({
      id: newUser.id,
      email: newUser.email,
      full_name: full_name || null,
      role_id: role_id || null,
      is_active,
    });

    // Optional: also create a linked staff member (personnel) for this account.
    if (create_staff) {
      const name = String(full_name || '').trim();
      const parts = name.split(/\s+/).filter(Boolean);
      const first = parts[0] || newUser.email.split('@')[0];
      const last = parts.slice(1).join(' ') || first;
      await supabase.from('staff_members').insert({
        first_name: first,
        last_name: last,
        email: newUser.email,
        profile_id: newUser.id,
        is_active: true,
      });
    }

    // Create audit log
    const meta = getRequestMeta(request);
    await createAuditLog({
      userId: currentUser.id,
      userEmail: currentUser.email,
      action: 'create',
      resourceType: 'user',
      resourceId: newUser.id,
      newValues: { email, full_name, role_id, is_active },
      ...meta
    });

    return NextResponse.json({ success: true, user: { id: newUser.id, email } });
  } catch (err) {
    console.error('Create user error:', err);
    if (err instanceof Error) {
      if (err.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (err.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
