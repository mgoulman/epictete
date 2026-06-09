'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Package, CalendarCheck, TrendingUp, Smartphone, Loader2 } from 'lucide-react';
import { usePermissions } from '@/lib/auth/hooks';

interface Setting { type: string; enabled: boolean; config: Record<string, unknown>; }

const TYPE_META: Record<string, { label: string; desc: string; icon: React.ElementType }> = {
  low_stock: { label: 'Alertes de stock bas', desc: "Quand un produit passe sous son seuil minimum.", icon: Package },
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

export function NotificationSettings() {
  const { hasPermission } = usePermissions();
  const canConfigure = hasPermission('settings.write');

  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<string | null>(null);

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

  const toggle = async (type: string, enabled: boolean) => {
    if (!canConfigure) return;
    setSavingType(type);
    setSettings(prev => prev.map(s => s.type === type ? { ...s, enabled } : s));
    try {
      await fetch('/api/notifications/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, enabled }),
      });
    } finally { setSavingType(null); }
  };

  const enablePush = async () => {
    setPushBusy(true);
    setPushError(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setPushError("Permission refusée par le navigateur."); return; }
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
    setPushBusy(true);
    setPushError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, { method: 'DELETE' });
        await sub.unsubscribe();
      }
      setPushSubscribed(false);
    } catch (e) {
      setPushError(e instanceof Error ? e.message : "Échec de la désactivation.");
    } finally { setPushBusy(false); }
  };

  return (
    <div className="bg-secondary border border-border rounded-xl p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Notifications &amp; alertes</h2>
        <p className="text-[13px] text-muted-foreground mt-1">
          Choisissez les alertes à générer et activez les notifications push sur cet appareil.
          {!canConfigure && ' (Lecture seule — réservé aux administrateurs.)'}
        </p>
      </div>

      {/* Alert types */}
      {loading ? (
        <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#606338]" /></div>
      ) : (
        <div className="flex flex-col gap-3">
          {settings.map(s => {
            const meta = TYPE_META[s.type] || { label: s.type, desc: '', icon: Bell };
            const Icon = meta.icon;
            return (
              <div key={s.type} className="flex items-center justify-between p-4 bg-card rounded-lg">
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 text-[#606338] mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground text-sm">{meta.label}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{meta.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggle(s.type, !s.enabled)}
                  disabled={!canConfigure || savingType === s.type}
                  className={`relative w-12 h-6 rounded-full transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed ${s.enabled ? 'bg-[#606338]' : 'bg-border'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${s.enabled ? 'left-[26px]' : 'left-0.5'}`} />
                </button>
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
                Recevez les alertes même quand l&apos;application est fermée. Installez d&apos;abord
                l&apos;app pour de meilleurs résultats.
              </p>
            </div>
          </div>
          {!pushSupported ? (
            <span className="text-[12px] text-muted-foreground">Non supporté sur cet appareil</span>
          ) : pushSubscribed ? (
            <button
              onClick={disablePush}
              disabled={pushBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-card disabled:opacity-50"
            >
              {pushBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Désactiver
            </button>
          ) : (
            <button
              onClick={enablePush}
              disabled={pushBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#606338] text-white text-sm font-medium hover:bg-[#4d4f2e] disabled:opacity-50"
            >
              {pushBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />} Activer
            </button>
          )}
        </div>
        {pushError && <p className="text-[12px] text-red-500 mt-2">{pushError}</p>}
      </div>
    </div>
  );
}
