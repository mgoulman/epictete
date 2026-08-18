// Client-side Web Push helpers, shared by the PWA permission prompt and the
// notification settings page so the subscribe flow stays in one place.

export type PushSetupResult =
  | 'subscribed' | 'denied' | 'unsupported' | 'not-configured' | 'error';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

/** Whether push is configured on the server (VAPID keys present). */
export async function isPushEnabledOnServer(): Promise<boolean> {
  try {
    const cfg = await fetch('/api/push/subscribe').then((r) => r.json());
    return Boolean(cfg?.enabled && cfg?.publicKey);
  } catch { return false; }
}

/**
 * Request permission (must be called from a user gesture — required on iOS),
 * subscribe via the service worker, and persist the subscription server-side.
 */
export async function subscribeToPush(): Promise<PushSetupResult> {
  if (!pushSupported()) return 'unsupported';

  const cfg = await fetch('/api/push/subscribe').then((r) => r.json()).catch(() => null);
  if (!cfg?.enabled || !cfg.publicKey) return 'not-configured';

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return 'denied';

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(cfg.publicKey) as unknown as BufferSource,
      });
    }
    const res = await fetch('/api/push/subscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub),
    });
    return res.ok ? 'subscribed' : 'error';
  } catch { return 'error'; }
}
