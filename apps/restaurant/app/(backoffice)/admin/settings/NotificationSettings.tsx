'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, CalendarCheck, Loader2, Users, ChevronDown, Save } from 'lucide-react';
import { usePermissions } from '@/lib/auth/hooks';
import { NOTIFICATION_TYPE_MAP, NOTIFICATION_TYPES, type NotifParam } from '@/lib/notification-types';
import { useToast } from '@/components/backoffice/ToastProvider';

interface Setting { type: string; enabled: boolean; config: Record<string, unknown>; }
interface Role { name: string; display_name: string; }
interface UserLite { id: string; full_name: string | null; email: string; }

const ICONS: Record<string, React.ElementType> = {
  CalendarCheck,
};
const REGISTRY_ORDER = NOTIFICATION_TYPES.reduce<Record<string, number>>((m, t, i) => { m[t.type] = i; return m; }, {});

const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

export function NotificationSettings() {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const canConfigure = hasPermission('settings.write');

  const [settings, setSettings] = useState<Setting[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications/settings');
      const data = await res.json();
      const rows: Setting[] = (data.settings || []).slice().sort(
        (a: Setting, b: Setting) => (REGISTRY_ORDER[a.type] ?? 99) - (REGISTRY_ORDER[b.type] ?? 99)
      );
      setSettings(rows);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Recipient pickers need the role + user lists (admin only).
  useEffect(() => {
    if (!canConfigure) return;
    Promise.all([fetch('/api/roles'), fetch('/api/users')]).then(async ([r, u]) => {
      const rd = await r.json().catch(() => ({}));
      const ud = await u.json().catch(() => ({}));
      if (r.ok) setRoles((rd.roles || []).filter((x: Role) => x.name !== 'admin' && x.name !== 'regular'));
      if (u.ok) setUsers(ud.users || []);
    }).catch(() => {});
  }, [canConfigure]);

  const toggleEnabled = async (type: string, enabled: boolean) => {
    if (!canConfigure) return;
    setSavingType(type);
    setSettings(prev => prev.map(s => s.type === type ? { ...s, enabled } : s));
    try {
      const res = await fetch('/api/notifications/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, enabled }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Une erreur est survenue');
    } finally { setSavingType(null); }
  };

  const toggleRecipient = (type: string, field: 'recipient_roles' | 'recipient_users', value: string) => {
    setSettings(prev => prev.map(s => {
      if (s.type !== type) return s;
      const set = new Set(arr(s.config[field]));
      if (set.has(value)) set.delete(value); else set.add(value);
      return { ...s, config: { ...s.config, [field]: Array.from(set) } };
    }));
  };

  // Merge a partial config change into a type's config (local state only).
  const patchConfig = (type: string, patch: Record<string, unknown>) => {
    setSettings(prev => prev.map(s => s.type === type ? { ...s, config: { ...s.config, ...patch } } : s));
  };

  const paramValue = (s: Setting, p: NotifParam) => {
    const v = Number(s.config[p.key]);
    return Number.isFinite(v) ? v : p.default;
  };

  // Persist the WHOLE config (PATCH replaces config), so no keys are dropped.
  const saveConfig = async (s: Setting) => {
    setSavingType(s.type);
    try {
      const res = await fetch('/api/notifications/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: s.type, config: s.config }),
      });
      if (!res.ok) throw new Error();
      toast.success('Enregistré');
    } catch {
      toast.error('Une erreur est survenue');
    } finally { setSavingType(null); }
  };

  return (
    <div className="bg-secondary border border-border rounded-xl p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Notifications &amp; alertes</h2>
        <p className="text-[13px] text-muted-foreground mt-1">
          Activez les alertes et choisissez qui les reçoit.
          {!canConfigure && ' (Configuration réservée aux administrateurs.)'}
        </p>
      </div>

      {loading ? (
        <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#606338]" /></div>
      ) : (
        <div className="flex flex-col gap-3">
          {settings.map(s => {
            const def = NOTIFICATION_TYPE_MAP[s.type];
            const meta = def
              ? { label: def.label, desc: def.desc, icon: ICONS[def.icon] || Bell }
              : { label: s.type, desc: '', icon: Bell };
            const Icon = meta.icon;
            const isOpen = expanded === s.type;
            const recRoles = arr(s.config.recipient_roles);
            const recUsers = arr(s.config.recipient_users);
            const showRecipients = !def?.dynamicRecipients;
            const params = def?.params ?? [];
            return (
              <div key={s.type} className="bg-card rounded-lg overflow-hidden shadow-[var(--shadow-sm)]">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 text-[#606338] mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground text-sm">{meta.label}</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">{meta.desc}</p>
                      {canConfigure && (
                        <button onClick={() => setExpanded(isOpen ? null : s.type)} className="text-[12px] text-[#606338] mt-1 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {showRecipients ? `Configurer · ${recRoles.length + recUsers.length} destinataire(s)` : 'Configurer'}
                          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleEnabled(s.type, !s.enabled)}
                    disabled={!canConfigure || savingType === s.type}
                    className={`relative w-12 h-6 rounded-full transition-colors shrink-0 disabled:opacity-60 ${s.enabled ? 'bg-[#606338]' : 'bg-border'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${s.enabled ? 'left-[26px]' : 'left-0.5'}`} />
                  </button>
                </div>

                {isOpen && canConfigure && (
                  <div className="px-4 pb-4 border-t border-border/60 pt-3 space-y-3">
                    {showRecipients && (
                      <>
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Rôles destinataires</div>
                          <div className="flex flex-wrap gap-2">
                            {roles.map(r => {
                              const active = recRoles.includes(r.name);
                              return (
                                <button key={r.name} onClick={() => toggleRecipient(s.type, 'recipient_roles', r.name)}
                                  className={`px-2.5 py-1.5 rounded-md text-[12px] font-medium border transition-colors ${active ? 'bg-[#606338] border-[#606338] text-white' : 'bg-secondary border-border text-muted-foreground hover:border-[#606338]/40'}`}>
                                  {r.display_name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {users.length > 0 && (
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Utilisateurs spécifiques</div>
                            <div className="flex flex-wrap gap-2">
                              {users.map(u => {
                                const active = recUsers.includes(u.id);
                                return (
                                  <button key={u.id} onClick={() => toggleRecipient(s.type, 'recipient_users', u.id)}
                                    className={`px-2.5 py-1.5 rounded-md text-[12px] font-medium border transition-colors ${active ? 'bg-[#606338] border-[#606338] text-white' : 'bg-secondary border-border text-muted-foreground hover:border-[#606338]/40'}`}>
                                    {u.full_name || u.email}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Per-type parameters (lead time, day of month…) */}
                    {params.length > 0 && (
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Paramètres</div>
                        <div className="flex flex-wrap gap-3">
                          {params.map(p => (
                            <label key={p.key} className="flex flex-col gap-1 text-[12px] text-muted-foreground">
                              <span>{p.label}</span>
                              <input
                                type="number"
                                min={p.kind === 'day_of_month' ? 1 : 0}
                                max={p.kind === 'day_of_month' ? 31 : undefined}
                                step={p.kind === 'currency' ? 100 : 1}
                                value={paramValue(s, p)}
                                onChange={(e) => patchConfig(s.type, { [p.key]: Number(e.target.value) })}
                                className="w-36 px-2.5 py-1.5 rounded-md border border-border bg-secondary text-foreground text-[13px]"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button onClick={() => saveConfig(s)} disabled={savingType === s.type}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#606338] text-white rounded-lg text-[13px] font-medium disabled:opacity-50">
                        {savingType === s.type ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Enregistrer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
