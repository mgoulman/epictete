// Auth library exports

// Server-side utilities
export {
  createSupabaseServerClient,
  getServerSession,
  checkServerPermission,
  requireAuth,
  requirePermission,
  enforce,
  enforceAdmin
} from './supabase-server';

// Client-side utilities
export { createSupabaseBrowserClient } from './supabase-browser';

// Hooks
export { AuthProvider, useAuth, usePermissions } from './hooks.js';

// Permission utilities
export {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
  isAdmin,
  getDefaultPermissions,
  canAccessResource,
  filterNavByPermissions,
  getAuthRedirect
} from './permissions';

// Audit utilities
export { createAuditLog, getAuditLogs, getRequestMeta } from './audit';
