'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Role, ProfileWithRole } from '@/lib/types/auth';

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => Promise<void>;
  user?: ProfileWithRole | null;
  roles: Role[];
  mode: 'create' | 'edit';
}

export interface UserFormData {
  email?: string;
  password?: string;
  full_name: string;
  role_id: string;
  is_active: boolean;
}

export function UserForm({ isOpen, onClose, onSubmit, user, roles, mode }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    full_name: '',
    role_id: '',
    is_active: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (user && mode === 'edit') {
      setFormData({
        full_name: user.full_name || '',
        role_id: user.role_id || '',
        is_active: user.is_active
      });
    } else {
      setFormData({
        email: '',
        password: '',
        full_name: '',
        role_id: roles[0]?.id || '',
        is_active: true
      });
    }
  }, [user, mode, roles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {mode === 'create' ? 'Create User' : 'Edit User'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--secondary)] transition-colors"
          >
            <X className="w-5 h-5 text-[var(--muted)]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {mode === 'create' && (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="w-full px-4 py-2 bg-[var(--secondary)] border border-[var(--border)]
                           rounded-lg text-[var(--foreground)] placeholder-[var(--muted)]
                           focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password || ''}
                  onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 bg-[var(--secondary)] border border-[var(--border)]
                           rounded-lg text-[var(--foreground)] placeholder-[var(--muted)]
                           focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Full Name
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              required
              className="w-full px-4 py-2 bg-[var(--secondary)] border border-[var(--border)]
                       rounded-lg text-[var(--foreground)] placeholder-[var(--muted)]
                       focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Role
            </label>
            <select
              value={formData.role_id}
              onChange={e => setFormData(prev => ({ ...prev, role_id: e.target.value }))}
              required
              className="w-full px-4 py-2 bg-[var(--secondary)] border border-[var(--border)]
                       rounded-lg text-[var(--foreground)]
                       focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="">Select a role</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.display_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)]
                       focus:ring-[var(--accent)]"
            />
            <label htmlFor="is_active" className="text-sm text-[var(--foreground)]">
              Account is active
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create User' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
