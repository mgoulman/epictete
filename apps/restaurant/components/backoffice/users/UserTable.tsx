'use client';

import { useState } from 'react';
import { Edit2, Trash2, UserCheck, UserX } from 'lucide-react';
import { DataTable } from '../shared/DataTable';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import type { ProfileWithRole } from '@/lib/types/auth';

interface UserTableProps {
  users: ProfileWithRole[];
  onEdit: (user: ProfileWithRole) => void;
  onDelete: (userId: string) => Promise<void>;
  onToggleActive: (userId: string, isActive: boolean) => Promise<void>;
}

export function UserTable({ users, onEdit, onDelete, onToggleActive }: UserTableProps) {
  const [deleteUser, setDeleteUser] = useState<ProfileWithRole | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toggleUser, setToggleUser] = useState<ProfileWithRole | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const handleDelete = async () => {
    if (!deleteUser) return;
    setIsDeleting(true);
    try {
      await onDelete(deleteUser.id);
    } finally {
      setIsDeleting(false);
      setDeleteUser(null);
    }
  };

  const handleToggle = async () => {
    if (!toggleUser) return;
    setIsToggling(true);
    try {
      await onToggleActive(toggleUser.id, !toggleUser.is_active);
    } finally {
      setIsToggling(false);
      setToggleUser(null);
    }
  };

  const columns = [
    {
      key: 'full_name',
      label: 'Name',
      sortable: true,
      render: (user: ProfileWithRole) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-medium text-sm">
            {user.full_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-medium">{user.full_name || 'No name'}</p>
            <p className="text-xs text-[var(--muted)]">{user.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (user: ProfileWithRole) => (
        <span className="px-2 py-1 text-xs rounded-full bg-[var(--accent)]/10 text-[var(--accent)] capitalize">
          {user.role?.display_name || 'No role'}
        </span>
      )
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (user: ProfileWithRole) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            user.is_active
              ? 'bg-green-500/10 text-green-500'
              : 'bg-red-500/10 text-red-500'
          }`}
        >
          {user.is_active ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (user: ProfileWithRole) => (
        <span className="text-[var(--muted)]">
          {new Date(user.created_at).toLocaleDateString()}
        </span>
      )
    }
  ];

  return (
    <>
      <DataTable
        data={users}
        columns={columns}
        keyField="id"
        searchPlaceholder="Search users..."
        emptyMessage="No users found"
        actions={(user: ProfileWithRole) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setToggleUser(user)}
              className={`p-2 rounded-lg transition-colors ${
                user.is_active
                  ? 'hover:bg-red-500/10 text-red-500'
                  : 'hover:bg-green-500/10 text-green-500'
              }`}
              title={user.is_active ? 'Deactivate' : 'Activate'}
            >
              {user.is_active ? (
                <UserX className="w-4 h-4" />
              ) : (
                <UserCheck className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => onEdit(user)}
              className="p-2 rounded-lg hover:bg-[var(--secondary)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeleteUser(user)}
              className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to deactivate ${deleteUser?.full_name || deleteUser?.email}? They will no longer be able to access the system.`}
        confirmLabel="Deactivate"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Toggle active confirmation */}
      <ConfirmDialog
        isOpen={!!toggleUser}
        onClose={() => setToggleUser(null)}
        onConfirm={handleToggle}
        title={toggleUser?.is_active ? 'Deactivate User' : 'Activate User'}
        message={
          toggleUser?.is_active
            ? `Are you sure you want to deactivate ${toggleUser?.full_name || toggleUser?.email}?`
            : `Are you sure you want to activate ${toggleUser?.full_name || toggleUser?.email}?`
        }
        confirmLabel={toggleUser?.is_active ? 'Deactivate' : 'Activate'}
        variant={toggleUser?.is_active ? 'warning' : 'default'}
        isLoading={isToggling}
      />
    </>
  );
}
