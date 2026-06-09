'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield, Plus, Trash2, Save, Loader2, X, Check, AlertTriangle,
  Users, ChevronDown, Lock,
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_system: boolean;
  permissions: string[];
  user_count: number;
}

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string | null;
}

const RESOURCE_ORDER = [
  'menu', 'recipes', 'salle', 'finance', 'inventory', 'reports',
  'personnel', 'transport', 'marketing', 'users', 'audit', 'settings',
];
const ACTION_ORDER = ['read', 'write', 'delete', 'manage', 'serve'];
const RESOURCE_LABELS: Record<string, string> = {
  menu: 'Menu', recipes: 'Fiches techniques', salle: 'Salle', finance: 'Finance',
  inventory: 'Inventaire', reports: 'Rapports', personnel: 'Personnel',
  transport: 'Transport', marketing: 'Marketing', users: 'Utilisateurs',
  audit: 'Audit', settings: 'Paramètres',
};
const ACTION_LABELS: Record<string, string> = {
  read: 'Voir', write: 'Modifier', delete: 'Supprimer', manage: 'Gérer', serve: 'Service',
};

export function RbacSettings() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [edited, setEdited] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', display_name: '', description: '' });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/roles');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setRoles(data.roles || []);
      setPermissions(data.permissions || []);
      const init: Record<string, Set<string>> = {};
      for (const r of data.roles || []) init[r.id] = new Set<string>(r.permissions || []);
      setEdited(init);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Permissions grouped by resource, deterministically ordered.
  const grouped = useMemo(() => {
    const byResource = new Map<string, Permission[]>();
    for (const p of permissions) {
      if (!byResource.has(p.resource)) byResource.set(p.resource, []);
      byResource.get(p.resource)!.push(p);
    }
    return [...byResource.keys()]
      .sort((a, b) => (RESOURCE_ORDER.indexOf(a) + 1 || 99) - (RESOURCE_ORDER.indexOf(b) + 1 || 99))
      .map(resource => ({
        resource,
        perms: byResource.get(resource)!.sort(
          (a, b) => (ACTION_ORDER.indexOf(a.action) + 1 || 99) - (ACTION_ORDER.indexOf(b.action) + 1 || 99)
        ),
      }));
  }, [permissions]);

  const isDirty = (role: Role) => {
    const cur = edited[role.id];
    if (!cur) return false;
    const orig = new Set(role.permissions);
    if (cur.size !== orig.size) return true;
    for (const p of cur) if (!orig.has(p)) return true;
    return false;
  };

  const togglePerm = (roleId: string, permName: string) => {
    setEdited(prev => {
      const next = new Set(prev[roleId] ?? []);
      if (next.has(permName)) next.delete(permName); else next.add(permName);
      return { ...prev, [roleId]: next };
    });
  };

  const saveRole = async (role: Role) => {
    setSavingRole(role.id);
    setError(null);
    try {
      const res = await fetch('/api/roles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: role.id, permissions: Array.from(edited[role.id] ?? []) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingRole(null);
    }
  };

  const createRole = async () => {
    if (!newRole.name.trim() || !newRole.display_name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRole),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      setNewRole({ name: '', display_name: '', description: '' });
      setShowCreate(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const deleteRole = async (role: Role) => {
    if (!confirm(`Supprimer le rôle « ${role.display_name} » ? Cette action est irréversible.`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/roles?id=${role.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="bg-secondary border border-border rounded-xl p-10 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#606338]" />
      </div>
    );
  }

  return (
    <div className="bg-secondary border border-border rounded-xl p-6 min-w-0">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#606338]/10 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-[#606338]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Rôles &amp; Permissions</h2>
            <p className="text-[13px] text-muted-foreground mt-1 max-w-xl">
              Choisissez un rôle pour gérer ses accès. Les changements prennent effet à la
              prochaine connexion de l&apos;utilisateur.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-[#606338] text-white rounded-lg text-sm font-medium hover:bg-[#4d4f2e] transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" /> Nouveau rôle
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-[13px] text-red-500">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Create role form */}
      {showCreate && (
        <div className="mb-5 p-4 bg-card rounded-lg border border-border">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Nom technique</label>
              <input
                value={newRole.name}
                onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                placeholder="ex: comptable"
                className="w-full py-2 px-3 bg-background border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Nom affiché</label>
              <input
                value={newRole.display_name}
                onChange={e => setNewRole({ ...newRole, display_name: e.target.value })}
                placeholder="ex: Comptable"
                className="w-full py-2 px-3 bg-background border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Description</label>
              <input
                value={newRole.description}
                onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                placeholder="optionnel"
                className="w-full py-2 px-3 bg-background border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/40"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={createRole}
              disabled={creating || !newRole.name.trim() || !newRole.display_name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-[#606338] text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Créer
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewRole({ name: '', display_name: '', description: '' }); }}
              className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-muted-foreground rounded-lg text-sm"
            >
              <X className="w-4 h-4" /> Annuler
            </button>
          </div>
        </div>
      )}

      {/* Role accordion */}
      <div className="flex flex-col gap-2">
        {roles.map(role => {
          const isAdminRole = role.name === 'admin';
          const set = edited[role.id] ?? new Set<string>();
          const dirty = isDirty(role);
          const isOpen = expanded === role.id;
          const count = isAdminRole ? permissions.length : set.size;

          return (
            <div key={role.id} className="border border-border rounded-lg overflow-hidden">
              {/* Card header */}
              <button
                onClick={() => setExpanded(isOpen ? null : role.id)}
                className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${isOpen ? 'bg-card' : 'hover:bg-card/50'}`}
              >
                <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{role.display_name}</span>
                    {role.is_system && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#606338]/15 text-[#606338] font-medium">système</span>
                    )}
                    {isAdminRole && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3" /> tous les droits
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-3">
                    <span>{role.name}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {role.user_count}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {count} permission{count > 1 ? 's' : ''}
                </span>
              </button>

              {/* Card body */}
              {isOpen && (
                <div className="p-4 border-t border-border bg-background/40">
                  {isAdminRole ? (
                    <p className="text-[13px] text-muted-foreground flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-500" />
                      Le rôle administrateur possède toujours toutes les permissions et ne peut pas être modifié.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                      {grouped.map(g => (
                        <div key={g.resource}>
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            {RESOURCE_LABELS[g.resource] || g.resource}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {g.perms.map(p => {
                              const active = set.has(p.name);
                              return (
                                <button
                                  key={p.id}
                                  onClick={() => togglePerm(role.id, p.name)}
                                  title={p.description || p.name}
                                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium border transition-colors ${
                                    active
                                      ? 'bg-[#606338] border-[#606338] text-white'
                                      : 'bg-card border-border text-muted-foreground hover:border-[#606338]/40'
                                  }`}
                                >
                                  {active ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 rounded-sm border border-current opacity-50" />}
                                  {ACTION_LABELS[p.action] || p.action}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer actions */}
                  {!isAdminRole && (
                    <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-border">
                      <div>
                        {!role.is_system && (
                          <button
                            onClick={() => deleteRole(role)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" /> Supprimer le rôle
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => saveRole(role)}
                        disabled={!dirty || savingRole === role.id}
                        className="flex items-center gap-2 px-4 py-2 bg-[#606338] text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {savingRole === role.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {dirty ? 'Enregistrer' : 'Enregistré'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
