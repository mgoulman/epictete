// Auth Types for RBAC System

// Eight primary roles. 'regular' is kept as a zero-access fallback for
// accounts with no role assigned (and for legacy data) — it is NOT one of the
// eight and grants nothing beyond the dashboard.
export type RoleName =
  | 'admin'
  | 'manager'
  | 'finance'
  | 'marketing'
  | 'cuisine'
  | 'rh'
  | 'serveur'
  | 'intern'
  | 'regular';

export type PermissionName =
  | 'menu.read'
  | 'menu.write'
  | 'menu.delete'
  | 'recipes.read'
  | 'recipes.write'
  | 'salle.read'
  | 'salle.write'
  | 'salle.serve'
  | 'finance.read'
  | 'finance.write'
  | 'inventory.read'
  | 'inventory.write'
  | 'reports.read'
  | 'reports.write'
  | 'personnel.read'
  | 'personnel.write'
  | 'transport.read'
  | 'transport.write'
  | 'marketing.read'
  | 'marketing.write'
  | 'users.read'
  | 'users.write'
  | 'users.delete'
  | 'users.manage'
  | 'audit.read'
  | 'settings.read'
  | 'settings.write';

export type ResourceType =
  | 'menu'
  | 'recipes'
  | 'salle'
  | 'finance'
  | 'inventory'
  | 'reports'
  | 'personnel'
  | 'transport'
  | 'marketing'
  | 'users'
  | 'audit'
  | 'settings';
export type ActionType = 'read' | 'write' | 'delete' | 'manage' | 'serve';

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
  'salle.read', 'salle.write', 'salle.serve',
  'finance.read', 'finance.write',
  'inventory.read', 'inventory.write',
  'reports.read', 'reports.write',
  'personnel.read', 'personnel.write',
  'transport.read', 'transport.write',
  'marketing.read', 'marketing.write',
  'users.read', 'users.write', 'users.delete', 'users.manage',
  'audit.read',
  'settings.read', 'settings.write',
];

export const ROLE_PERMISSIONS: Record<RoleName, PermissionName[]> = {
  // Full access
  admin: ALL_PERMISSIONS,
  // All operations, but not user management or system writes
  manager: [
    'menu.read', 'menu.write', 'menu.delete',
    'recipes.read', 'recipes.write',
    'salle.read', 'salle.write', 'salle.serve',
    'finance.read', 'finance.write',
    'inventory.read', 'inventory.write',
    'reports.read', 'reports.write',
    'personnel.read', 'personnel.write',
    'transport.read', 'transport.write',
    'marketing.read', 'marketing.write',
    'users.read',
    'audit.read',
    'settings.read',
  ],
  // Finance / comptable
  finance: [
    'finance.read', 'finance.write',
    'inventory.read', 'inventory.write',
    'reports.read', 'reports.write',
    'menu.read',
  ],
  // Marketing / communication
  marketing: [
    'marketing.read', 'marketing.write',
    'menu.read',
  ],
  // Kitchen / chef
  cuisine: [
    'menu.read', 'menu.write',
    'recipes.read', 'recipes.write',
    'inventory.read',
  ],
  // HR / personnel & transport
  rh: [
    'personnel.read', 'personnel.write',
    'transport.read', 'transport.write',
    'users.read',
  ],
  // Waiter / floor service
  serveur: [
    'salle.read', 'salle.serve',
  ],
  // Intern / stagiaire — read-only observer (menu, salle, inventory), no recipes
  intern: [
    'menu.read', 'salle.read', 'inventory.read',
  ],
  // Zero-access fallback (no role assigned / legacy)
  regular: [],
};

// Pathname prefix → permission required to load the page. Used by middleware
// for route-level authorization. Order matters: the longest matching prefix
// wins, so more specific routes (e.g. /admin/salle/service) are listed first.
// Routes not listed here (e.g. /admin dashboard) require only authentication.
export const ROUTE_PERMISSIONS: ReadonlyArray<readonly [string, PermissionName]> = [
  ['/admin/salle/service', 'salle.serve'],
  ['/admin/salle', 'salle.write'],
  ['/admin/menus', 'menu.read'],
  ['/admin/menu', 'menu.read'],
  ['/admin/recipes', 'recipes.read'],
  ['/admin/inventory', 'inventory.read'],
  ['/admin/finance', 'finance.read'],
  ['/admin/reports', 'reports.read'],
  ['/admin/personnel', 'personnel.read'],
  ['/admin/transport', 'transport.read'],
  ['/admin/marketing', 'marketing.read'],
  ['/admin/docs', 'marketing.read'],
  ['/admin/users', 'users.manage'],
  ['/admin/audit', 'audit.read'],
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
  { key: 'dashboard', label: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
  {
    key: 'menuManagement',
    label: 'Menu Management',
    href: '/admin/menu',
    icon: 'UtensilsCrossed',
    permission: 'menu.read',
    children: [
      { key: 'menuItems', label: 'Menu Items', href: '/admin/menu', icon: 'UtensilsCrossed', permission: 'menu.read' },
      { key: 'menus', label: 'Menus', href: '/admin/menus', icon: 'FileText', permission: 'menu.read' },
      { key: 'recipes', label: 'Fiches Techniques', href: '/admin/recipes', icon: 'BookOpen', permission: 'recipes.read' }
    ]
  },
  {
    key: 'salle',
    label: 'Salle',
    href: '/admin/salle',
    icon: 'Armchair',
    permission: 'salle.read',
    children: [
      { key: 'floorPlan', label: 'Plan de Salle', href: '/admin/salle', icon: 'Map', permission: 'salle.write' },
      { key: 'service', label: 'Service', href: '/admin/salle/service', icon: 'ClipboardList', permission: 'salle.serve' }
    ]
  },
  { key: 'inventory', label: 'Inventaire', href: '/admin/inventory', icon: 'Package', permission: 'inventory.read' },
  { key: 'users', label: 'Users', href: '/admin/users', icon: 'Users', permission: 'users.manage' },
  { key: 'personnel', label: 'Personnel', href: '/admin/personnel', icon: 'UserCog', permission: 'personnel.read' },
  { key: 'transport', label: 'Transport', href: '/admin/transport', icon: 'Bus', permission: 'transport.read' },
  { key: 'marketing', label: 'Marketing', href: '/admin/marketing', icon: 'Megaphone', permission: 'marketing.read' },
  { key: 'docs', label: 'Docs', href: '/admin/docs', icon: 'FileText', permission: 'marketing.read' },
  {
    key: 'finance',
    label: 'Finance',
    href: '/admin/finance',
    icon: 'DollarSign',
    permission: 'finance.read',
    defaultOpen: true,
    children: [
      { key: 'overview', label: 'Overview', href: '/admin/finance?tab=overview', icon: 'BarChart3', permission: 'finance.read' },
      { key: 'sales', label: 'Sales', href: '/admin/finance?tab=sales', icon: 'TrendingUp', permission: 'finance.read' },
      { key: 'inventory', label: 'Inventory', href: '/admin/finance?tab=inventory', icon: 'Package', permission: 'finance.read' },
      { key: 'vendors', label: 'Vendors', href: '/admin/finance?tab=vendors', icon: 'Users', permission: 'finance.read' },
      { key: 'import', label: 'Import', href: '/admin/finance?tab=import', icon: 'Upload', permission: 'finance.read' }
    ]
  },
  {
    key: 'reports',
    label: 'Reports',
    href: '/admin/reports',
    icon: 'ClipboardList',
    permission: 'reports.read',
    children: [
      { key: 'dailyEntry', label: 'Saisie Journalière', href: '/admin/reports?tab=daily', icon: 'Calendar' },
      { key: 'suiviJournalier', label: 'Suivi Journalier', href: '/admin/reports?tab=suivi', icon: 'Table' },
      { key: 'recapMensuel', label: 'Récap Mensuel', href: '/admin/reports?tab=recap', icon: 'BarChart3' },
      { key: 'expenses', label: 'Dépenses', href: '/admin/reports?tab=expenses', icon: 'Receipt' },
      { key: 'stockMovements', label: 'Mouvements Stock', href: '/admin/reports?tab=movements', icon: 'ArrowUpDown' }
    ]
  },
  { key: 'auditLogs', label: 'Audit Logs', href: '/admin/audit', icon: 'ScrollText', permission: 'audit.read' },
  { key: 'settings', label: 'Settings', href: '/admin/settings', icon: 'Settings', permission: 'settings.read' }
];
