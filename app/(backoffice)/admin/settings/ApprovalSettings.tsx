'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Loader2, Save } from 'lucide-react';

interface Rule {
  module: string;
  enabled: boolean;
  requester_roles: string[];
  approver_roles: string[];
}
interface Role { name: string; display_name: string; }

const MODULE_LABEL: Record<string, string> = {
  inventory: 'Inventaire (Achats & Stock)', menu: 'Menu', finance: 'Finance',
};

export function ApprovalSettings() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, rolesRes] = await Promise.all([
        fetch('/api/approvals/rules'),
        fetch('/api/roles'),
      ]);
      const rData = await rRes.json();
      const rolesData = await rolesRes.json();
      if (!rRes.ok) throw new Error(rData.error || 'Chargement impossible');
      setRules(rData.rules || []);
      setRoles((rolesData.roles || []).filter((r: Role) => r.name !== 'admin' && r.name !== 'regular'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (module: string, patch: Partial<Rule>) =>
    setRules(prev => prev.map(r => r.module === module ? { ...r, ...patch } : r));

  const toggleRole = (module: string, field: 'requester_roles' | 'approver_roles', role: string) => {
    setRules(prev => prev.map(r => {
      if (r.module !== module) return r;
      const set = new Set(r[field]);
      if (set.has(role)) set.delete(role); else set.add(role);
      return { ...r, [field]: Array.from(set) };
    }));
  };

  const save = async (rule: Rule) => {
    setSaving(rule.module);
    setError(null);
    try {
      const res = await fetch('/api/approvals/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Échec'); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec');
    } finally { setSaving(null); }
  };

  if (loading) {
    return <div className="bg-secondary border border-border rounded-xl p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#606338]" /></div>;
  }

  return (
    <div className="bg-secondary border border-border rounded-xl p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#606338]/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-[#606338]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Validations (approbations)</h2>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-xl">
            Pour chaque module, exigez une validation avant qu&apos;un changement s&apos;applique.
            Les écritures faites par les <strong>rôles demandeurs</strong> sont mises en attente
            jusqu&apos;à l&apos;approbation d&apos;un <strong>rôle approbateur</strong>. Les admins ne sont jamais bloqués.
          </p>
        </div>
      </div>

      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[13px] text-red-500">{error}</div>}

      <div className="flex flex-col gap-4">
        {rules.map(rule => (
          <div key={rule.module} className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-foreground">{MODULE_LABEL[rule.module] || rule.module}</span>
              <button
                onClick={() => update(rule.module, { enabled: !rule.enabled })}
                className={`relative w-12 h-6 rounded-full transition-colors ${rule.enabled ? 'bg-[#606338]' : 'bg-border'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${rule.enabled ? 'left-[26px]' : 'left-0.5'}`} />
              </button>
            </div>

            {rule.enabled && (
              <div className="space-y-3">
                <RoleRow label="Rôles demandeurs (mis en attente)" roles={roles} selected={rule.requester_roles}
                  onToggle={(role) => toggleRole(rule.module, 'requester_roles', role)} />
                <RoleRow label="Rôles approbateurs" roles={roles} selected={rule.approver_roles}
                  onToggle={(role) => toggleRole(rule.module, 'approver_roles', role)} />
              </div>
            )}

            <div className="flex justify-end mt-3">
              <button
                onClick={() => save(rule)}
                disabled={saving === rule.module}
                className="flex items-center gap-2 px-4 py-2 bg-[#606338] text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving === rule.module ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoleRow({ label, roles, selected, onToggle }: {
  label: string; roles: Role[]; selected: string[]; onToggle: (role: string) => void;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">
        {roles.map(r => {
          const active = selected.includes(r.name);
          return (
            <button
              key={r.name}
              onClick={() => onToggle(r.name)}
              className={`px-2.5 py-1.5 rounded-md text-[12px] font-medium border transition-colors ${
                active ? 'bg-[#606338] border-[#606338] text-white' : 'bg-card border-border text-muted-foreground hover:border-[#606338]/40'
              }`}
            >
              {r.display_name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
