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

    const { email, password, full_name, role_id, is_active = true } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Create user in Supabase Auth
    // Note: In production, you might want to use admin API for this
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (authError) {
      // Fallback to regular signup if admin API is not available
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name }
        }
      });

      if (signUpError) {
        return NextResponse.json({ error: signUpError.message }, { status: 400 });
      }

      if (signUpData.user) {
        // Update profile with role
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ role_id, full_name, is_active })
          .eq('id', signUpData.user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
        }

        // Create audit log
        const meta = getRequestMeta(request);
        await createAuditLog({
          userId: currentUser.id,
          userEmail: currentUser.email,
          action: 'create',
          resourceType: 'user',
          resourceId: signUpData.user.id,
          newValues: { email, full_name, role_id, is_active },
          ...meta
        });

        return NextResponse.json({
          success: true,
          user: { id: signUpData.user.id, email }
        });
      }
    } else if (authData.user) {
      // Update profile with role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role_id, full_name, is_active })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      // Create audit log
      const meta = getRequestMeta(request);
      await createAuditLog({
        userId: currentUser.id,
        userEmail: currentUser.email,
        action: 'create',
        resourceType: 'user',
        resourceId: authData.user.id,
        newValues: { email, full_name, role_id, is_active },
        ...meta
      });

      return NextResponse.json({
        success: true,
        user: { id: authData.user.id, email }
      });
    }

    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
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
