import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';
import { createJWT } from '@/lib/auth/supabase-server';
import type { PermissionName, RoleName } from '@/lib/types/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Verify credentials
    const { rows: users } = await db.query(
      "SELECT id, email FROM users WHERE email = $1 AND password_hash = crypt($2, password_hash)",
      [email, password]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = users[0];

    // Check profile
    const { rows: profiles } = await db.query(
      `SELECT p.*, r.name as role_name FROM profiles p LEFT JOIN roles r ON r.id = p.role_id WHERE p.id = $1`,
      [user.id]
    );

    if (profiles.length === 0) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const profile = profiles[0] as Record<string, unknown>;
    if (!profile.is_active) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
    }

    // Get permissions
    const { rows: perms } = await db.query<{ name: string }>(
      `SELECT p.name FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = $1`,
      [profile.role_id]
    );

    // Create JWT and set cookie
    const token = await createJWT(user.id as string);
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        role: (profile.role_name as RoleName) || 'regular',
        permissions: perms.map(p => p.name) as PermissionName[],
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
