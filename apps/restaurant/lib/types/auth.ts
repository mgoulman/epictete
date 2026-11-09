// Auth Types for RBAC System

// Primary roles. 'regular' is kept as a zero-access fallback for accounts with
// no role assigned (and for legacy data) — it grants nothing beyond the
// dashboard. ('serveur' was removed with the Salle feature.)
export type RoleName =
  | 'admin'
  | 'manager'
  | 'finance'
  | 'marketing'
  | 'cuisine'
  | 'rh'
  | 'intern'
  | 'regular';

export type PermissionName =
  | 'menu.read'
  | 'menu.write'
  | 'menu.delete'
  | 'recipes.read'
  | 'recipes.write'
  | 'reports.read'
  | 'reports.write'
  | 'personnel.read'
  | 'marketing.read'
  | 'marketing.write'
  | 'users.read'
  | 'users.write'
  | 'users.delete'
  | 'users.manage'
  | 'settings.read'
  | 'settings.write';

export type ResourceType =
  | 'menu'
  | 'recipes'
  | 'reports'
  | 'personnel'
  | 'marketing'
  | 'users'
  | 'settings';
export type ActionType = 'read' | 'write' | 'delete' | 'manage';

export interface Role {
  id: string;
  name: RoleName;
  display_name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  name: PermissionName;
  resource: ResourceType;
  action: ActionType;
  description: string | null;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileWithRole extends Profile {
  role: Role | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: Role | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: RoleName;
  permissions: PermissionName[];
}

export interface Session {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
}

// Canonical role → permission matrix. This is the single source of truth used
// by the middleware (edge-safe, no DB) and as the seed for the role_permissions
// table. getServerSession resolves a user's live permissions from the DB, so
// admin-customised role grants stay authoritative there.
export const ALL_PERMISSIONS: PermissionName[] = [
  'menu.read', 'menu.write', 'menu.delete',
  'recipes.read', 'recipes.write',
  'reports.read', 'reports.write',
  'personnel.read',
  'marketing.read', 'marketing.write',
  'users.read', 'users.write', 'users.delete', 'users.manage',
  'settings.read', 'settings.write',
];

export const ROLE_PERMISSIONS: Record<RoleName, PermissionName[]> = {
  // Full access
  admin: ALL_PERMISSIONS,
  // All operations, but not user management or system writes
  manager: [
    'menu.read', 'menu.write', 'menu.delete',
    'recipes.read', 'recipes.write',
    'reports.read', 'reports.write',
    'personnel.read',
    'marketing.read', 'marketing.write',
    'users.read',
    'settings.read',
  ],
  // Finance / comptable — now scoped to Reports (accounting lives in Odoo)
  finance: [
    'reports.read', 'reports.write',
    'menu.read',
  ],
  // Marketing / communication
  marketing: [
    'marketing.read', 'marketing.write',
    'menu.read',
  ],
  // Kitchen / chef — menu + recipe cards
  cuisine: [
    'menu.read', 'menu.write',
    'recipes.read', 'recipes.write',
  ],
  // HR — read-only staff list (personnel management lives in Odoo) + user list
  rh: [
    'personnel.read',
    'users.read',
  ],
  // Intern / stagiaire — menu observer
  intern: [
    'menu.read',
  ],
  // Zero-access fallback (no role assigned / legacy)
  regular: [],
};

// Pathname prefix → permission required to load the page. Used by middleware
// for route-level authorization. Order matters: the longest matching prefix
// wins, so more specific routes (e.g. /admin/salle/service) are listed first.
// Routes not listed here (e.g. /admin dashboard) require only authentication.
export const ROUTE_PERMISSIONS: ReadonlyArray<readonly [string, PermissionName]> = [
  ['/admin/menus', 'menu.read'],
  ['/admin/menu', 'menu.read'],
  ['/admin/reports', 'reports.read'],
  ['/admin/marketing', 'marketing.read'],
  ['/admin/docs', 'marketing.read'],
  ['/admin/users', 'users.manage'],
  ['/admin/settings', 'settings.read'],
];

/** Returns the permission required for a given pathname, or null if none. */
export function requiredPermissionForPath(pathname: string): PermissionName | null {
  for (const [prefix, permission] of ROUTE_PERMISSIONS) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      return permission;
    }
  }
  return null;
}

// ── Backoffice allowlist ────────────────────────────────────────────────────
// For the moment the web backoffice is reduced to the Feuille de Caisse and is
// restricted to a single operator. Only these emails may hold a backoffice
// session; everyone else is refused at login and in the edge middleware.
export const BACKOFFICE_ALLOWED_EMAILS: readonly string[] = [
  'alaoui.adiib@epictete.ma',
];

export function isBackofficeAllowed(email?: string | null): boolean {
  if (!email) return false;
  return BACKOFFICE_ALLOWED_EMAILS.includes(email.trim().toLowerCase());
}

// Navigation items with required permissions
export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: string;
  permission?: PermissionName;
  children?: NavItem[];
  defaultOpen?: boolean;
}

export const BACKOFFICE_NAV: NavItem[] = [
  { key: 'feuilleCaisse', label: 'Feuille de Caisse', href: '/admin/reports', icon: 'ClipboardList' },
];
