import type { PermissionName, RoleName, AuthUser } from '@/lib/types/auth';
import { ROLE_PERMISSIONS } from '@/lib/types/auth';

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: AuthUser | null, permission: PermissionName): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

/**
 * Check if a user has any of the given permissions
 */
export function hasAnyPermission(user: AuthUser | null, permissions: PermissionName[]): boolean {
  if (!user) return false;
  return permissions.some(permission => user.permissions.includes(permission));
}

/**
 * Check if a user has all of the given permissions
 */
export function hasAllPermissions(user: AuthUser | null, permissions: PermissionName[]): boolean {
  if (!user) return false;
  return permissions.every(permission => user.permissions.includes(permission));
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: AuthUser | null, role: RoleName): boolean {
  if (!user) return false;
  return user.role === role;
}

/**
 * Check if user has any of the given roles
 */
export function hasAnyRole(user: AuthUser | null, roles: RoleName[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * Check if user is an admin
 */
export function isAdmin(user: AuthUser | null): boolean {
  return hasRole(user, 'admin');
}

/**
 * Get default permissions for a role
 */
export function getDefaultPermissions(role: RoleName): PermissionName[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a permission allows access to a resource
 */
export function canAccessResource(
  user: AuthUser | null,
  resource: 'menu' | 'users' | 'marketing' | 'finance' | 'audit' | 'settings',
  action: 'read' | 'write' | 'delete' | 'manage' = 'read'
): boolean {
  if (!user) return false;

  const permission = `${resource}.${action}` as PermissionName;

  // Admin always has access
  if (user.role === 'admin') return true;

  return user.permissions.includes(permission);
}

/**
 * Filter navigation items based on user permissions
 */
export function filterNavByPermissions<T extends { permission?: PermissionName }>(
  items: T[],
  user: AuthUser | null
): T[] {
  if (!user) return [];

  return items.filter(item => {
    if (!item.permission) return true;
    return hasPermission(user, item.permission);
  });
}

/**
 * Route protection helper - returns redirect path if not authorized
 */
export function getAuthRedirect(
  user: AuthUser | null,
  requiredPermission?: PermissionName
): string | null {
  if (!user) {
    return '/login';
  }

  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return '/admin'; // Redirect to dashboard if no permission
  }

  return null;
}
