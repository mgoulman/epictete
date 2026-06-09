// Server-side notification helpers: create notifications and (re)generate the
// data-driven low-stock alerts. Web Push fan-out is layered on top of
// createNotification() so any new notification can also be pushed.

import db from '@/lib/db';
import { sendPushToAll } from '@/lib/push';

export type NotificationType = 'low_stock' | 'new_reservation' | 'daily_summary';

// Alert types whose enable/disable + recipients are configured in settings.
const CONFIGURED_TYPES = new Set(['low_stock', 'new_reservation', 'daily_summary']);

interface CreateNotificationInput {
  type: string;
  title: string;
  message?: string | null;
  severity?: 'info' | 'warning' | 'success';
  link?: string | null;
  requiredPermission?: string | null;
  dedupKey?: string | null;
  push?: boolean; // also send a web push (default true)
  targetRoles?: string[] | null;  // explicit recipient roles (overrides config)
  targetUsers?: string[] | null;  // explicit recipient user ids (overrides config)
  system?: boolean;               // skip the enabled check + recipient config lookup
}

interface TypeConfig {
  enabled: boolean;
  recipient_roles?: string[];
  recipient_users?: string[];
}

async function getTypeConfig(type: string): Promise<TypeConfig | null> {
  const { rows } = await db.query<{ enabled: boolean; config: Record<string, unknown> }>(
    'SELECT enabled, config FROM notification_settings WHERE type = $1', [type]
  );
  if (rows.length === 0) return null;
  const c = rows[0].config || {};
  return {
    enabled: rows[0].enabled,
    recipient_roles: Array.isArray(c.recipient_roles) ? (c.recipient_roles as string[]) : undefined,
    recipient_users: Array.isArray(c.recipient_users) ? (c.recipient_users as string[]) : undefined,
  };
}

/** Whether a notification type is enabled in notification_settings (default true). */
export async function isTypeEnabled(type: string): Promise<boolean> {
  const cfg = await getTypeConfig(type);
  return cfg === null ? true : cfg.enabled;
}

/**
 * Insert a notification (idempotent when dedupKey is provided). Returns the new
 * row id, or null if it was a duplicate / the type is disabled. Recipients are
 * resolved from explicit targets, else from the type's configured recipients.
 */
export async function createNotification(input: CreateNotificationInput): Promise<string | null> {
  let targetRoles = input.targetRoles ?? null;
  let targetUsers = input.targetUsers ?? null;

  if (!input.system && CONFIGURED_TYPES.has(input.type)) {
    const cfg = await getTypeConfig(input.type);
    if (cfg && !cfg.enabled) return null;
    if (targetRoles === null && targetUsers === null) {
      targetRoles = cfg?.recipient_roles ?? null;
      targetUsers = cfg?.recipient_users ?? null;
    }
  }

  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO notifications (type, title, message, severity, link, required_permission, dedup_key, target_roles, target_users)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
      targetRoles && targetRoles.length ? targetRoles : null,
      targetUsers && targetUsers.length ? targetUsers : null,
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
