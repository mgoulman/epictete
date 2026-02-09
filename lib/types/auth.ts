// Auth Types for RBAC System

export type RoleName = 'admin' | 'finance' | 'marketing' | 'regular' | 'waiter';

export type PermissionName =
  | 'menu.read'
  | 'menu.write'
  | 'menu.delete'
  | 'users.read'
  | 'users.write'
  | 'users.delete'
  | 'users.manage'
  | 'marketing.read'
  | 'marketing.write'
  | 'finance.read'
  | 'finance.write'
  | 'audit.read'
  | 'settings.read'
  | 'settings.write'
  | 'salle.read'
  | 'salle.write'
  | 'salle.serve';

export type ResourceType = 'menu' | 'users' | 'marketing' | 'finance' | 'audit' | 'settings' | 'salle';
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

// Permission matrix for quick reference
export const ROLE_PERMISSIONS: Record<RoleName, PermissionName[]> = {
  admin: [
    'menu.read', 'menu.write', 'menu.delete',
    'users.read', 'users.write', 'users.delete', 'users.manage',
    'marketing.read', 'marketing.write',
    'finance.read', 'finance.write',
    'audit.read',
    'settings.read', 'settings.write',
    'salle.read', 'salle.write', 'salle.serve'
  ],
  finance: [
    'finance.read', 'finance.write'
  ],
  marketing: [
    'marketing.read', 'marketing.write'
  ],
  regular: [
    'menu.read'
  ],
  waiter: [
    'salle.read', 'salle.serve'
  ]
};

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
      { key: 'menuItems', label: 'Menu Items', href: '/admin/menu', icon: 'UtensilsCrossed' },
      { key: 'menus', label: 'Menus', href: '/admin/menus', icon: 'FileText' },
      { key: 'recipes', label: 'Fiches Techniques', href: '/admin/recipes', icon: 'BookOpen' }
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
      { key: 'service', label: 'Service', href: '/admin/salle/service', icon: 'ClipboardList' }
    ]
  },
  { key: 'users', label: 'Users', href: '/admin/users', icon: 'Users', permission: 'users.manage' },
  { key: 'personnel', label: 'Personnel', href: '/admin/personnel', icon: 'UserCog', permission: 'users.manage' },
  { key: 'transport', label: 'Transport', href: '/admin/transport', icon: 'Bus', permission: 'users.manage' },
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
      { key: 'overview', label: 'Overview', href: '/admin/finance?tab=overview', icon: 'BarChart3' },
      { key: 'sales', label: 'Sales', href: '/admin/finance?tab=sales', icon: 'TrendingUp' },
      { key: 'inventory', label: 'Inventory', href: '/admin/finance?tab=inventory', icon: 'Package' },
      { key: 'vendors', label: 'Vendors', href: '/admin/finance?tab=vendors', icon: 'Users' },
      { key: 'import', label: 'Import', href: '/admin/finance?tab=import', icon: 'Upload' }
    ]
  },
  { key: 'auditLogs', label: 'Audit Logs', href: '/admin/audit', icon: 'ScrollText', permission: 'audit.read' },
  { key: 'settings', label: 'Settings', href: '/admin/settings', icon: 'Settings', permission: 'settings.read' }
];
