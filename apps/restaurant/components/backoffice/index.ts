// Backoffice components exports

// Auth components
export { LoginForm } from './auth/LoginForm';
export { PermissionGate, AdminOnly, CanManageUsers, CanViewFinance, CanViewMarketing, CanEditMenu } from './auth/PermissionGate';

// Layout components
export { Sidebar } from './layout/Sidebar';
export { Header } from './layout/Header';
export { BackofficeShell } from './layout/BackofficeShell';

// User management components
export { UserTable } from './users/UserTable';
export { UserForm } from './users/UserForm';
export type { UserFormData } from './users/UserForm';

// Shared components
export { DataTable } from './shared/DataTable';
export { ConfirmDialog } from './shared/ConfirmDialog';
