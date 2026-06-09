'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Package, CalendarCheck, TrendingUp, Smartphone, Loader2, Users, ChevronDown, Save } from 'lucide-react';
import { usePermissions } from '@/lib/auth/hooks';

interface Setting { type: string; enabled: boolean; config: Record<string, unknown>; }
interface Role { name: string; display_name: string; }
interface UserLite { id: string; full_name: string | null; email: string; }

const TYPE_META: Record<string, { label: string; desc: string; icon: React.ElementType }> = {
  low_stock: { label: 'Alertes de stock bas', desc: 'Quand un produit passe sous son seuil minimum.', icon: Package },
  new_reservation: { label: 'Nouvelles réservations', desc: 'Quand une réservation est reçue.', icon: CalendarCheck },
  daily_summary: { label: 'Résumé quotidien des ventes', desc: 'Un récapitulatif des ventes chaque matin.', icon: TrendingUp },
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

export function NotificationSettings() {
  const { hasPermission } = usePermissions();
  const canConfigure = hasPermission('settings.write');

  const [settings, setSettings] = useState<Setting[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Push state
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications/settings');
      const data = await res.json();
      setSettings(data.settings || []);
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

  // Detect push support + existing subscription
  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
    setPushSupported(supported);
    if (!supported) return;
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setPushSubscribed(Boolean(sub)))
      .catch(() => {});
  }, []);

  const toggleEnabled = async (type: string, enabled: boolean) => {
    if (!canConfigure) return;
    setSavingType(type);
    setSettings(prev => prev.map(s => s.type === type ? { ...s, enabled } : s));
    try {
      await fetch('/api/notifications/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, enabled }),
      });
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

  const saveRecipients = async (s: Setting) => {
    setSavingType(s.type);
    try {
      await fetch('/api/notifications/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: s.type,
          config: { recipient_roles: arr(s.config.recipient_roles), recipient_users: arr(s.config.recipient_users) },
        }),
      });
    } finally { setSavingType(null); }
  };

  const enablePush = async () => {
    setPushBusy(true); setPushError(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setPushError('Permission refusée par le navigateur.'); return; }
      const cfg = await fetch('/api/push/subscribe').then(r => r.json());
      if (!cfg.enabled || !cfg.publicKey) { setPushError('Push non configuré sur le serveur (clés VAPID manquantes).'); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(cfg.publicKey) as unknown as BufferSource,
      });
      const res = await fetch('/api/push/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error('subscribe failed');
      setPushSubscribed(true);
    } catch (e) {
      setPushError(e instanceof Error ? e.message : "Échec de l'activation.");
    } finally { setPushBusy(false); }
  };

  const disablePush = async () => {
    setPushBusy(true); setPushError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, { method: 'DELETE' });
        await sub.unsubscribe();
      }
      setPushSubscribed(false);
    } catch (e) {
      setPushError(e instanceof Error ? e.message : 'Échec de la désactivation.');
    } finally { setPushBusy(false); }
  };

  return (
    <div className="bg-secondary border border-border rounded-xl p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Notifications &amp; alertes</h2>
        <p className="text-[13px] text-muted-foreground mt-1">
          Activez les alertes, choisissez qui les reçoit, et activez le push sur cet appareil.
          {!canConfigure && ' (Configuration réservée aux administrateurs.)'}
        </p>
      </div>

      {loading ? (
        <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#606338]" /></div>
      ) : (
        <div className="flex flex-col gap-3">
          {settings.map(s => {
            const meta = TYPE_META[s.type] || { label: s.type, desc: '', icon: Bell };
            const Icon = meta.icon;
            const isOpen = expanded === s.type;
            const recRoles = arr(s.config.recipient_roles);
            const recUsers = arr(s.config.recipient_users);
            return (
              <div key={s.type} className="bg-card rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 text-[#606338] mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground text-sm">{meta.label}</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">{meta.desc}</p>
                      {canConfigure && (
                        <button onClick={() => setExpanded(isOpen ? null : s.type)} className="text-[12px] text-[#606338] mt-1 flex items-center gap-1">
                          <Users className="w-3 h-3" /> Destinataires ({recRoles.length + recUsers.length})
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
                    <div className="flex justify-end">
                      <button onClick={() => saveRecipients(s)} disabled={savingType === s.type}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#606338] text-white rounded-lg text-[13px] font-medium disabled:opacity-50">
                        {savingType === s.type ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Enregistrer les destinataires
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Push notifications */}
      <div className="pt-5 border-t border-border">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-[#606338] mt-0.5" />
            <div>
              <p className="font-medium text-foreground text-sm">Notifications push (cet appareil)</p>
              <p className="text-[12px] text-muted-foreground mt-0.5 max-w-md">
                Recevez les alertes même quand l&apos;application est fermée.
              </p>
            </div>
          </div>
          {!pushSupported ? (
            <span className="text-[12px] text-muted-foreground">Non supporté sur cet appareil</span>
          ) : pushSubscribed ? (
            <button onClick={disablePush} disabled={pushBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-card disabled:opacity-50">
              {pushBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Désactiver
            </button>
          ) : (
            <button onClick={enablePush} disabled={pushBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#606338] text-white text-sm font-medium hover:bg-[#4d4f2e] disabled:opacity-50">
              {pushBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />} Activer
            </button>
          )}
        </div>
        {pushError && <p className="text-[12px] text-red-500 mt-2">{pushError}</p>}
      </div>
    </div>
  );
}
