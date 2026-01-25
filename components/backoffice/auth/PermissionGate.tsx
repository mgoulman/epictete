'use client';

import { usePermissions } from '@/lib/auth/hooks';
import type { PermissionName, RoleName } from '@/lib/types/auth';

interface PermissionGateProps {
  children: React.ReactNode;
  permission?: PermissionName;
  permissions?: PermissionName[];
  requireAll?: boolean;
  role?: RoleName;
  roles?: RoleName[];
  fallback?: React.ReactNode;
}

export function PermissionGate({
  children,
  permission,
  permissions,
  requireAll = false,
  role,
  roles,
  fallback = null
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasRole, isAdmin } = usePermissions();

  // Admin always has access
  if (isAdmin()) {
    return <>{children}</>;
  }

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    if (requireAll) {
      const hasAll = permissions.every(p => hasPermission(p));
      if (!hasAll) return <>{fallback}</>;
    } else {
      if (!hasAnyPermission(permissions)) return <>{fallback}</>;
    }
  }

  // Check single role
  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  // Check multiple roles
  if (roles && roles.length > 0) {
    const hasAnyRole = roles.some(r => hasRole(r));
    if (!hasAnyRole) return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Convenience components for common permission checks
export function AdminOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate role="admin" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function CanManageUsers({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate permission="users.manage" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function CanViewFinance({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate permission="finance.read" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function CanViewMarketing({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate permission="marketing.read" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function CanEditMenu({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate permission="menu.write" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}
