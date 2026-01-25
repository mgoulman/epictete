import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { AuthUser, PermissionName, RoleName, ProfileWithRole } from '@/lib/types/auth';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Ignore errors in Server Components
          }
        },
      },
    }
  );
}

export async function getServerSession(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  // Get profile with role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(`
      *,
      role:roles(*)
    `)
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  const typedProfile = profile as ProfileWithRole;

  // Get user permissions
  const { data: permissions } = await supabase
    .from('role_permissions')
    .select(`
      permission:permissions(name)
    `)
    .eq('role_id', typedProfile.role_id);

  const permissionNames = (permissions || [])
    .map((p: unknown) => {
      const perm = p as { permission: { name: string } | null };
      return perm.permission?.name;
    })
    .filter(Boolean) as PermissionName[];

  return {
    id: user.id,
    email: user.email || '',
    full_name: typedProfile.full_name,
    avatar_url: typedProfile.avatar_url,
    role: (typedProfile.role?.name as RoleName) || 'regular',
    permissions: permissionNames
  };
}

export async function checkServerPermission(permission: PermissionName): Promise<boolean> {
  const session = await getServerSession();
  if (!session) return false;
  return session.permissions.includes(permission);
}

export async function requireAuth(): Promise<AuthUser> {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requirePermission(permission: PermissionName): Promise<AuthUser> {
  const session = await requireAuth();
  if (!session.permissions.includes(permission)) {
    throw new Error('Forbidden');
  }
  return session;
}
