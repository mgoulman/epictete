import { db } from "@/lib/db";
import { getSaasSession } from "@/lib/auth";
import type { SessionView } from "@/lib/session-view";

/**
 * Assemble the client-facing session for the shell: identity (global users/profiles)
 * + tenant + default branch + role/perms. Platform-level lookups (unsafeQuery) since
 * this runs before any tenant context is established. Returns null when signed out.
 */
export async function getSessionView(): Promise<SessionView | null> {
  const s = await getSaasSession();
  if (!s) return null;

  const [u, t, b] = await Promise.all([
    db.unsafeQuery<{ name: string; email: string }>(
      `SELECT COALESCE(NULLIF(p.full_name, ''), u.email) AS name, u.email
         FROM users u LEFT JOIN profiles p ON p.id = u.id
        WHERE u.id = $1`,
      [s.userId],
    ),
    db.unsafeQuery<{ name: string; slug: string }>(
      `SELECT name, slug FROM tenants WHERE id = $1`,
      [s.tenantId],
    ),
    db.unsafeQuery<{ name: string }>(
      `SELECT name FROM branches WHERE tenant_id = $1 ORDER BY is_default DESC, name LIMIT 1`,
      [s.tenantId],
    ),
  ]);

  if (u.rows.length === 0 || t.rows.length === 0) return null;

  return {
    user: { id: s.userId, name: u.rows[0].name, email: u.rows[0].email },
    tenant: { name: t.rows[0].name, slug: t.rows[0].slug },
    branch: b.rows[0] ? { name: b.rows[0].name } : null,
    role: s.role,
    perms: s.perms,
  };
}
