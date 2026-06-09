// Server-side notification helpers: create notifications and (re)generate the
// data-driven low-stock alerts. Web Push fan-out is layered on top of
// createNotification() so any new notification can also be pushed.

import db from '@/lib/db';
import { sendPushToAll } from '@/lib/push';

export type NotificationType = 'low_stock' | 'new_reservation' | 'daily_summary';

interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message?: string | null;
  severity?: 'info' | 'warning' | 'success';
  link?: string | null;
  requiredPermission?: string | null;
  dedupKey?: string | null;
  push?: boolean; // also send a web push (default true)
}

/** Whether a notification type is enabled in notification_settings (default true). */
export async function isTypeEnabled(type: NotificationType): Promise<boolean> {
  const { rows } = await db.query<{ enabled: boolean }>(
    'SELECT enabled FROM notification_settings WHERE type = $1', [type]
  );
  return rows.length === 0 ? true : rows[0].enabled;
}

/**
 * Insert a notification (idempotent when dedupKey is provided). Returns the new
 * row id, or null if it was a duplicate / the type is disabled.
 */
export async function createNotification(input: CreateNotificationInput): Promise<string | null> {
  if (!(await isTypeEnabled(input.type))) return null;

  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO notifications (type, title, message, severity, link, required_permission, dedup_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (dedup_key) DO NOTHING
     RETURNING id`,
    [
      input.type,
      input.title,
      input.message ?? null,
      input.severity ?? 'info',
      input.link ?? null,
      input.requiredPermission ?? null,
      input.dedupKey ?? null,
    ]
  );

  const id = rows[0]?.id ?? null;
  if (id && input.push !== false) {
    // Fire-and-forget; never let push failures break the caller.
    sendPushToAll({
      title: input.title,
      body: input.message ?? '',
      url: input.link ?? '/admin',
    }).catch(() => {});
  }
  return id;
}

/**
 * Reconcile low-stock notifications with the current inventory state:
 * one active alert per product at/under its minimum stock, and remove alerts
 * for products that have been restocked. No-op when the alert type is disabled.
 */
export async function generateLowStockNotifications(): Promise<void> {
  const { rows: settingRows } = await db.query<{ enabled: boolean }>(
    "SELECT enabled FROM notification_settings WHERE type = 'low_stock'"
  );
  if (settingRows.length && !settingRows[0].enabled) {
    // Disabled: clear any existing low-stock alerts.
    await db.query("DELETE FROM notifications WHERE type = 'low_stock'");
    return;
  }

  // Products currently at/under their (positive) minimum stock.
  const { rows: low } = await db.query<{ id: string; name: string; quantity: string; unit: string; minimum_stock: string }>(
    `SELECT id, name, quantity, unit, minimum_stock
     FROM inventory_items
     WHERE minimum_stock > 0 AND quantity <= minimum_stock`
  );

  const currentKeys = low.map(i => `low_stock:${i.id}`);

  // Remove alerts for products that are no longer low.
  if (currentKeys.length) {
    await db.query(
      "DELETE FROM notifications WHERE type = 'low_stock' AND dedup_key <> ALL($1::text[])",
      [currentKeys]
    );
  } else {
    await db.query("DELETE FROM notifications WHERE type = 'low_stock'");
  }

  // Insert any new ones (dedup_key keeps it idempotent).
  for (const item of low) {
    await createNotification({
      type: 'low_stock',
      title: `Stock bas : ${item.name}`,
      message: `${item.quantity} ${item.unit} restant(s) (seuil : ${item.minimum_stock} ${item.unit}).`,
      severity: 'warning',
      link: '/admin/inventory',
      requiredPermission: 'inventory.read',
      dedupKey: `low_stock:${item.id}`,
      push: false, // bulk reconcile — avoid a push storm; pushes fire on first creation below
    });
  }
}
