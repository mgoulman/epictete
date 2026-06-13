'use client';

import { useState, useEffect, useCallback } from 'react';
import { PermissionGate } from '@/components/backoffice/auth/PermissionGate';
import {
  Plus, Pencil, Trash2, X, Users, Search,
  UserCheck, UserX, Shield, Mail, Calendar
} from 'lucide-react';
import type { Role, ProfileWithRole } from '@/lib/types/auth';
import { SortHeader, SortDir, sortCompare } from '@/components/backoffice/shared/SortHeader';
import { RowMenu } from '@/components/backoffice/shared/RowMenu';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface UserFormData {
  email: string;
  password: string;
  full_name: string;
  role_id: string;
  is_active: boolean;
}

const emptyForm: UserFormData = {
  email: '',
  password: '',
  full_name: '',
  role_id: '',
  is_active: true
};

export default function UsersPage() {
  const { t } = useTranslation();
  const u = t.backoffice.users;

  const [users, setUsers] = useState<ProfileWithRole[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ProfileWithRole | null>(null);
  const [formData, setFormData] = useState<UserFormData>(emptyForm);
  const [makeStaff, setMakeStaff] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'delete' | 'toggle';
    user: ProfileWithRole;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await fetch('/api/roles');
      if (!response.ok) throw new Error('Failed to fetch roles');
      const data = await response.json();
      setRoles(data.roles);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchRoles()]);
      setLoading(false);
    };
    loadData();
  }, [fetchUsers, fetchRoles]);

  const handleOpenModal = (user?: ProfileWithRole) => {
    setFormError(null);
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email || '',
        password: '',
        full_name: user.full_name || '',
        role_id: user.role_id || '',
        is_active: user.is_active
      });
    } else {
      setEditingUser(null);
      setFormData({ ...emptyForm, role_id: roles[0]?.id || '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData(emptyForm);
    setMakeStaff(false);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!formData.full_name || !formData.role_id) {
      setFormError(u.requiredFields);
      return;
    }
    if (!editingUser && (!formData.email || !formData.password)) {
      setFormError(u.emailPasswordRequired);
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (editingUser) {
        const response = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: formData.full_name,
            role_id: formData.role_id,
            is_active: formData.is_active
          })
        });
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to update user');
        }
      } else {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, create_staff: makeStaff })
        });
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to create user');
        }
      }
      await fetchUsers();
      handleCloseModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirmDialog || confirmDialog.type !== 'delete') return;
    setConfirming(true);
    try {
      const response = await fetch(`/api/users/${confirmDialog.user.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete user');
      }
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
    setConfirming(false);
    setConfirmDialog(null);
  };

  const handleToggleActive = async () => {
    if (!confirmDialog || confirmDialog.type !== 'toggle') return;
    setConfirming(true);
    try {
      const response = await fetch(`/api/users/${confirmDialog.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !confirmDialog.user.is_active })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update user');
      }
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
    setConfirming(false);
    setConfirmDialog(null);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !selectedRole || user.role_id === selectedRole;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && user.is_active) ||
      (filterStatus === 'inactive' && !user.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedUsers = [...filteredUsers].sort((a, b) =>
    sortField ? sortCompare(a, b, sortField, sortDir) : 0
  );

  const totalUsers = users.length;
  const activeUsers = users.filter(usr => usr.is_active).length;
  const inactiveUsers = users.filter(usr => !usr.is_active).length;

  const getRoleName = (roleId: string | null) => {
    if (!roleId) return u.noRole;
    return roles.find(r => r.id === roleId)?.display_name || u.unknown;
  };

  const getRoleClasses = (roleName: string | undefined) => {
    switch (roleName?.toLowerCase()) {
      case 'admin':
      case 'administrator':
        return { bg: 'bg-red-500/15', text: 'text-red-500' };
      case 'finance':
        return { bg: 'bg-green-500/15', text: 'text-green-500' };
      case 'marketing':
        return { bg: 'bg-purple-500/15', text: 'text-purple-500' };
      default:
        return { bg: 'bg-[#606338]/15', text: 'text-[#606338]' };
    }
  };

  const getInitials = (user: ProfileWithRole) => {
    if (user.full_name) {
      return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.email?.[0]?.toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-6 h-6 border-2 border-[#606338] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PermissionGate
      permission="users.manage"
      fallback={
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground">{t.backoffice.shared.noPermission}</p>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{u.title}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{u.subtitle}</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-[#606338] to-[#4d4f2e] rounded-lg text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {u.addUser}
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="bg-transparent border-none text-red-500 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: u.totalUsers, value: totalUsers, colorClass: 'text-[#606338]', bgClass: 'bg-[#606338]/10', icon: Users },
            { label: u.active, value: activeUsers, colorClass: 'text-green-500', bgClass: 'bg-green-500/10', icon: UserCheck },
            { label: u.inactive, value: inactiveUsers, colorClass: 'text-red-500', bgClass: 'bg-red-500/10', icon: UserX }
          ].map(stat => (
            <div key={stat.label} className="bg-secondary border border-border rounded-lg p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stat.bgClass} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.colorClass}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`text-2xl font-semibold ${stat.colorClass} mt-0.5`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Role Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedRole(null)}
            className={`px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-all border ${
              !selectedRole ? 'bg-[#606338] border-[#606338] text-white' : 'bg-card border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {u.allRoles} ({users.length})
          </button>
          {roles.map(role => {
            const count = users.filter(usr => usr.role_id === role.id).length;
            const isSelected = selectedRole === role.id;
            const classes = getRoleClasses(role.name);
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-all border ${
                  isSelected ? `${classes.text} border-current bg-current/10` : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                {role.display_name} ({count})
              </button>
            );
          })}
        </div>

        {/* Search and Filters */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={u.searchPlaceholder}
              className="w-full py-2.5 pl-10 pr-3 bg-secondary border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/40"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            className="py-2.5 px-3.5 bg-secondary border border-border rounded-lg text-foreground text-sm cursor-pointer"
          >
            <option value="all">{u.allStatus}</option>
            <option value="active">{u.activeOnly}</option>
            <option value="inactive">{u.inactiveOnly}</option>
          </select>
        </div>

        {/* Results Count */}
        <p className="text-[13px] text-muted-foreground">{`${t.backoffice.shared.showing} ${filteredUsers.length} ${t.backoffice.shared.of} ${users.length} ${u.title.toLowerCase()}`}</p>

        {/* Users Table */}
        <div className="bg-secondary border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[1fr_140px_120px_100px_50px] gap-4 px-4 py-3 border-b border-border bg-card">
            <SortHeader label={u.user} field="full_name" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="text-xs font-semibold text-muted uppercase" />
            <SortHeader label={u.role} field="role.name" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="text-xs font-semibold text-muted uppercase" />
            <SortHeader label={u.status} field="is_active" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="text-xs font-semibold text-muted uppercase" />
            <SortHeader label={u.joined} field="created_at" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="text-xs font-semibold text-muted uppercase" />
            <span></span>
          </div>

          {/* Rows */}
          {sortedUsers.map((user, index) => {
            const roleClasses = getRoleClasses(user.role?.name);
            return (
              <div
                key={user.id}
                className={`grid grid-cols-1 md:grid-cols-[1fr_140px_120px_100px_50px] gap-4 px-4 py-3.5 items-center ${
                  index > 0 ? 'border-t border-border' : ''
                } ${!user.is_active ? 'opacity-60' : ''}`}
              >
                {/* User Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#606338] to-[#4d4f2e] flex items-center justify-center text-white text-sm font-semibold shrink-0">
                    {getInitials(user)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{user.full_name || u.noName}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${roleClasses.bg} ${roleClasses.text}`}>
                    <Shield className="w-3 h-3" />
                    {getRoleName(user.role_id)}
                  </span>
                </div>

                {/* Status */}
                <div>
                  <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium ${
                    user.is_active ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500'
                  }`}>
                    {user.is_active ? u.active : u.inactive}
                  </span>
                </div>

                {/* Joined */}
                <div className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Calendar className="w-3 h-3" />
                  {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>

                {/* Actions */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <RowMenu>
                    {(close) => (
                      <>
                        <button
                          onClick={() => { handleOpenModal(user); close(); }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-transparent border-none text-foreground text-[13px] cursor-pointer text-left hover:bg-secondary"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          {u.editUser}
                        </button>
                        <button
                          onClick={() => { setConfirmDialog({ type: 'toggle', user }); close(); }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-transparent border-none text-foreground text-[13px] cursor-pointer text-left hover:bg-secondary"
                        >
                          {user.is_active ? <><UserX className="w-3.5 h-3.5" />{u.deactivate}</> : <><UserCheck className="w-3.5 h-3.5" />{u.activate}</>}
                        </button>
                        <button
                          onClick={() => { setConfirmDialog({ type: 'delete', user }); close(); }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-transparent border-none text-red-500 text-[13px] cursor-pointer text-left hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {u.deleteUser}
                        </button>
                      </>
                    )}
                  </RowMenu>
                </div>
              </div>
            );
          })}

          {filteredUsers.length === 0 && (
            <div className="py-12 px-6 text-center">
              <Users className="w-12 h-12 text-muted mx-auto mb-4" />
              <p className="text-muted-foreground">{u.noUsers}</p>
            </div>
          )}
        </div>
      </div>

      {/* User Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-secondary border border-border rounded-2xl w-full max-w-[450px] max-h-[90vh] overflow-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-secondary z-10">
              <h2 className="text-lg font-semibold text-foreground">{editingUser ? u.editUser : u.addUser}</h2>
              <button onClick={handleCloseModal} className="p-2 bg-transparent border-none rounded-md cursor-pointer text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-3.5 py-2.5 rounded-lg text-[13px]">{formError}</div>
              )}

              {!editingUser && (
                <>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">{u.email} *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/40"
                      placeholder={u.placeholderEmail}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">{u.password} *</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/40"
                      placeholder={u.minChars}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{u.fullName} *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/40"
                  placeholder={u.placeholderName}
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">{u.role} *</label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  className="w-full py-2.5 px-3 bg-card border border-border rounded-lg text-foreground text-sm outline-none"
                >
                  <option value="">{u.selectRole}</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.display_name}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 accent-[#606338]"
                />
                <span className="text-sm text-foreground">{u.accountActive}</span>
              </label>

              {!editingUser && (
                <label className="flex items-center gap-2.5 cursor-pointer mt-3">
                  <input
                    type="checkbox"
                    checked={makeStaff}
                    onChange={(e) => setMakeStaff(e.target.checked)}
                    className="w-4 h-4 accent-[#606338]"
                  />
                  <span className="text-sm text-foreground">Ajouter aussi comme membre du personnel</span>
                </label>
              )}
            </div>

            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border sticky bottom-0 bg-secondary">
              <button onClick={handleCloseModal} className="px-5 py-2.5 bg-transparent border border-border rounded-lg text-foreground text-sm cursor-pointer hover:bg-card">
                {t.backoffice.shared.cancel}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-gradient-to-br from-[#606338] to-[#4d4f2e] border-none rounded-lg text-white text-sm font-medium cursor-pointer disabled:opacity-70 disabled:cursor-wait"
              >
                {saving ? u.saving : (editingUser ? u.saveChanges : u.createUser)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-secondary border border-border rounded-2xl w-full max-w-[400px] p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-foreground mb-3">
              {confirmDialog.type === 'delete' ? u.deleteUser : confirmDialog.user.is_active ? u.deactivateUser : u.activateUser}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {confirmDialog.type === 'delete' ? (
                <>{u.confirmDeleteMsg} <strong className="text-foreground">{confirmDialog.user.full_name || confirmDialog.user.email}</strong>? {u.cannotUndo}</>
              ) : confirmDialog.user.is_active ? (
                <>{u.confirmDeactivateMsg} <strong className="text-foreground">{confirmDialog.user.full_name || confirmDialog.user.email}</strong>? {u.noAccessMsg}</>
              ) : (
                <>{u.confirmActivateMsg} <strong className="text-foreground">{confirmDialog.user.full_name || confirmDialog.user.email}</strong>?</>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                disabled={confirming}
                className="px-5 py-2.5 bg-transparent border border-border rounded-lg text-foreground text-sm cursor-pointer hover:bg-card"
              >
                {t.backoffice.shared.cancel}
              </button>
              <button
                onClick={confirmDialog.type === 'delete' ? handleDelete : handleToggleActive}
                disabled={confirming}
                className={`px-5 py-2.5 border-none rounded-lg text-white text-sm font-medium cursor-pointer disabled:opacity-70 disabled:cursor-wait ${
                  confirmDialog.type === 'delete' || confirmDialog.user.is_active ? 'bg-red-500' : 'bg-green-500'
                }`}
              >
                {confirming ? t.backoffice.shared.processing : confirmDialog.type === 'delete' ? t.backoffice.shared.delete : confirmDialog.user.is_active ? u.deactivate : u.activate}
              </button>
            </div>
          </div>
        </div>
      )}
    </PermissionGate>
  );
}
