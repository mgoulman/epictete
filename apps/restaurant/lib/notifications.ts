// Server-side notification helpers: create in-app notifications and resolve
// their configured recipients. (Web Push was removed with the PWA.)

import db from '@/lib/db';
import { CONFIGURABLE_TYPES } from '@/lib/notification-types';

export type NotificationType = 'low_stock' | 'new_reservation' | 'daily_summary';

// Alert types whose enable/disable + recipients + channels are configured in
// settings. Sourced from the registry so adding a type wires up automatically.
const CONFIGURED_TYPES = new Set<string>(CONFIGURABLE_TYPES);

interface CreateNotificationInput {
  type: string;
  title: string;
  message?: string | null;
  severity?: 'info' | 'warning' | 'success' | 'danger';
  link?: string | null;
  requiredPermission?: string | null;
  dedupKey?: string | null;
  targetRoles?: string[] | null;  // explicit recipient roles (overrides config)
  targetUsers?: string[] | null;  // explicit recipient user ids (overrides config)
  system?: boolean;               // skip the enabled check + recipient config lookup
}

interface TypeConfig {
  enabled: boolean;
  recipient_roles?: string[];
  recipient_users?: string[];
  raw: Record<string, unknown>;   // full config jsonb (threshold_mad, lead_time_days, …)
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
    raw: c,
  };
}

/** Whether a notification type is enabled in notification_settings (default true). */
export async function isTypeEnabled(type: string): Promise<boolean> {
  const cfg = await getTypeConfig(type);
  return cfg === null ? true : cfg.enabled;
}

/**
 * Resolve a type's effective settings for generators: { enabled, config }.
 * Falls back to enabled=true with an empty config when no row exists.
 */
export async function getNotificationConfig(
  type: string,
): Promise<{ enabled: boolean; config: Record<string, unknown> }> {
  const cfg = await getTypeConfig(type);
  return cfg === null ? { enabled: true, config: {} } : { enabled: cfg.enabled, config: cfg.raw };
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

  return rows[0]?.id ?? null;
}

