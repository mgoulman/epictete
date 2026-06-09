'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Shield, Plus, Trash2, Save, Loader2, X, Check, AlertTriangle, Users } from 'lucide-react';

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

export function RbacSettings() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [edited, setEdited] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  // Permissions grouped by resource, both ordered deterministically.
  const grouped = useMemo(() => {
    const byResource = new Map<string, Permission[]>();
    for (const p of permissions) {
      if (!byResource.has(p.resource)) byResource.set(p.resource, []);
      byResource.get(p.resource)!.push(p);
    }
    const resources = [...byResource.keys()].sort(
      (a, b) => (RESOURCE_ORDER.indexOf(a) + 1 || 99) - (RESOURCE_ORDER.indexOf(b) + 1 || 99)
    );
    return resources.map(resource => ({
      resource,
      perms: byResource.get(resource)!.sort(
        (a, b) => (ACTION_ORDER.indexOf(a.action) + 1 || 99) - (ACTION_ORDER.indexOf(b.action) + 1 || 99)
      ),
    }));
  }, [permissions]);

  const orderedPerms = useMemo(() => grouped.flatMap(g => g.perms), [grouped]);

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
    <div className="bg-secondary border border-border rounded-xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#606338]/10 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-[#606338]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Rôles &amp; Permissions</h2>
            <p className="text-[13px] text-muted-foreground mt-1">
              Cochez les permissions de chaque rôle. Les changements prennent effet à la
              prochaine requête de l&apos;utilisateur. Le rôle <strong>admin</strong> a toujours tous les droits.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-[#606338] text-white rounded-lg text-sm font-medium hover:bg-[#4d4f2e] transition-colors"
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

      {/* Matrix */}
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-card">
              <th className="sticky left-0 z-10 bg-card text-left p-3 font-semibold text-foreground border-b border-r border-border min-w-[200px]">
                Rôle
              </th>
              {grouped.map(g => (
                <th
                  key={g.resource}
                  colSpan={g.perms.length}
                  className="p-2 text-center font-semibold text-foreground capitalize border-b border-l border-border whitespace-nowrap"
                >
                  {g.resource}
                </th>
              ))}
              <th className="p-3 border-b border-l border-border" />
            </tr>
            <tr className="bg-card/60">
              <th className="sticky left-0 z-10 bg-card/60 border-b border-r border-border" />
              {orderedPerms.map(p => (
                <th
                  key={p.id}
                  title={p.description || p.name}
                  className="p-2 text-center text-[11px] font-medium text-muted-foreground capitalize border-b border-l border-border whitespace-nowrap"
                >
                  {p.action}
                </th>
              ))}
              <th className="p-2 text-[11px] text-muted-foreground border-b border-l border-border text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(role => {
              const isAdminRole = role.name === 'admin';
              const set = edited[role.id] ?? new Set<string>();
              const dirty = isDirty(role);
              return (
                <tr key={role.id} className="hover:bg-card/40">
                  <td className="sticky left-0 z-10 bg-secondary p-3 border-b border-r border-border align-top">
                    <div className="font-medium text-foreground flex items-center gap-2">
                      {role.display_name}
                      {role.is_system && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#606338]/15 text-[#606338] font-medium">système</span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{role.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Users className="w-3 h-3" /> {role.user_count}
                    </div>
                  </td>

                  {orderedPerms.map(p => {
                    const checked = isAdminRole ? true : set.has(p.name);
                    return (
                      <td key={p.id} className="p-2 text-center border-b border-l border-border">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isAdminRole}
                          onChange={() => togglePerm(role.id, p.name)}
                          className="w-4 h-4 accent-[#606338] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </td>
                    );
                  })}

                  <td className="p-2 border-b border-l border-border align-middle">
                    <div className="flex items-center gap-1.5 justify-center">
                      {!isAdminRole && dirty && (
                        <button
                          onClick={() => saveRole(role)}
                          disabled={savingRole === role.id}
                          title="Enregistrer"
                          className="flex items-center gap-1 px-2 py-1 bg-[#606338] text-white rounded text-[11px] font-medium disabled:opacity-50"
                        >
                          {savingRole === role.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        </button>
                      )}
                      {!role.is_system && (
                        <button
                          onClick={() => deleteRole(role)}
                          title="Supprimer le rôle"
                          className="flex items-center justify-center w-7 h-7 rounded text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground mt-3">
        Astuce : survolez l&apos;en-tête d&apos;une colonne pour voir la description de la permission.
        Les rôles « système » ne peuvent pas être supprimés ; un rôle assigné à des utilisateurs doit
        être vidé avant suppression.
      </p>
    </div>
  );
}
