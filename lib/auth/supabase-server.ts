// Local PostgreSQL auth — replaces Supabase server client
// Provides the same interface so API routes need minimal changes

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import db from '@/lib/db';
import type { AuthUser, PermissionName, RoleName, ProfileWithRole } from '@/lib/types/auth';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'epictete-secret-key-change-in-production-2026');

// ─── JWT helpers ────────────────────────────────────────────────────────────

export async function createJWT(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyJWT(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { sub: string };
  } catch {
    return null;
  }
}

// ─── Get current user from cookie ───────────────────────────────────────────

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  const payload = await verifyJWT(token);
  return payload?.sub || null;
}

// ─── Supabase-compatible client interface ───────────────────────────────────
// Returns an object with .from() and .auth methods so existing API routes
// can use it with minimal changes: const supabase = await createSupabaseServerClient();

export async function createSupabaseServerClient() {
  const userId = await getCurrentUserId();

  return {
    from: db.from.bind(db),
    auth: {
      async getUser() {
        if (!userId) return { data: { user: null }, error: { message: 'Not authenticated' } };
        const { rows } = await db.query('SELECT id, email FROM users WHERE id = $1', [userId]);
        if (rows.length === 0) return { data: { user: null }, error: { message: 'User not found' } };
        return { data: { user: { id: rows[0].id, email: rows[0].email } }, error: null };
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const { rows } = await db.query(
          "SELECT id, email FROM users WHERE email = $1 AND password_hash = crypt($2, password_hash)",
          [email, password]
        );
        if (rows.length === 0) return { data: { user: null }, error: { message: 'Invalid credentials' } };
        return { data: { user: rows[0] }, error: null };
      },
      async signOut() {
        // Cookie clearing is handled by the logout route
      },
    },
  };
}

// ─── Session helpers (same as before) ───────────────────────────────────────

export async function getServerSession(): Promise<AuthUser | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { rows: profileRows } = await db.query<ProfileWithRole & { role_name: string; role_display_name: string }>(
    `SELECT p.*, r.name as role_name, r.display_name as role_display_name
     FROM profiles p
     LEFT JOIN roles r ON r.id = p.role_id
     WHERE p.id = $1`,
    [userId]
  );

  if (profileRows.length === 0) return null;
  const profile = profileRows[0];

  if (!profile.is_active) return null;

  const { rows: permRows } = await db.query<{ name: string }>(
    `SELECT p.name FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = $1`,
    [profile.role_id]
  );

  return {
    id: userId,
    email: profile.email || '',
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    role: (profile.role_name as RoleName) || 'regular',
    permissions: permRows.map(r => r.name) as PermissionName[],
  };
}

export async function checkServerPermission(permission: PermissionName): Promise<boolean> {
  const session = await getServerSession();
  if (!session) return false;
  return session.permissions.includes(permission);
}

export async function requireAuth(): Promise<AuthUser> {
  const session = await getServerSession();
  if (!session) throw new Error('Unauthorized');
  return session;
}

export async function requirePermission(permission: PermissionName): Promise<AuthUser> {
  const session = await requireAuth();
  if (!session.permissions.includes(permission)) throw new Error('Forbidden');
  return session;
}
