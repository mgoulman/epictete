// Web Push (PWA) helpers. Gracefully no-ops when VAPID keys are not configured,
// so the in-app notification system works with or without push set up.

import webpush from 'web-push';
import db from '@/lib/db';

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contact@epictetelerestaurant.ma';

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!PUBLIC_KEY || !PRIVATE_KEY) return false;
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  configured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return Boolean(PUBLIC_KEY && PRIVATE_KEY);
}

export function getVapidPublicKey(): string {
  return PUBLIC_KEY;
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Send a push to every stored subscription; prune ones the browser has dropped. */
export async function sendPushToAll(payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  let subs: SubscriptionRow[] = [];
  try {
    const { rows } = await db.query<SubscriptionRow>(
      'SELECT id, endpoint, p256dh, auth FROM push_subscriptions'
    );
    subs = rows;
  } catch {
    return; // table missing or DB error — push is best-effort
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/admin',
  });

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        // 404/410 → subscription expired; remove it.
        if (status === 404 || status === 410) {
          await db.query('DELETE FROM push_subscriptions WHERE id = $1', [s.id]).catch(() => {});
        }
      }
    })
  );
}
