import { runWithTenant } from "@epictete/core/db";
import { db } from "@/lib/db";
import { getSaasSession } from "@/lib/auth";
import { getSaasClaims } from "@/lib/tenant";
import type { SessionView } from "@/lib/session-view";

/**
 * Assemble the client-facing session for the shell: identity (global users/profiles)
 * + tenant + default branch + role/perms. Platform-level lookups (unsafeQuery) since
 * this runs before any tenant context is established. Returns null when signed out.
 */
export async function getSessionView(): Promise<SessionView | null> {
  const s = await getSaasSession();
  if (!s) return null;

  const ctx = { tenantId: s.tenantId, userId: s.userId, role: s.role ?? undefined };
  const [u, tb] = await Promise.all([
    // identity tables are global (no RLS)
    db.unsafeQuery<{ name: string; email: string }>(
      `SELECT COALESCE(NULLIF(p.full_name, ''), u.email) AS name, u.email
         FROM users u LEFT JOIN profiles p ON p.id = u.id
        WHERE u.id = $1`,
      [s.userId],
    ),
    // tenant + branch are RLS-scoped → read inside the tenant context
    runWithTenant(ctx, async () => {
      const t = await db.query<{ name: string; slug: string; status: string }>(
        `SELECT name, slug, status FROM tenants LIMIT 1`,
      );
      const b = await db.query<{ name: string }>(
        `SELECT name FROM branches ORDER BY is_default DESC, name LIMIT 1`,
      );
      return { t: t.rows, b: b.rows };
    }),
  ]);

  if (u.rows.length === 0 || tb.t.length === 0) return null;
  const t = { rows: tb.t };
  const b = { rows: tb.b };

  const claims = await getSaasClaims();

  return {
    user: { id: s.userId, name: u.rows[0].name, email: u.rows[0].email },
    tenant: { name: t.rows[0].name, slug: t.rows[0].slug, status: t.rows[0].status },
    branch: b.rows[0] ? { name: b.rows[0].name } : null,
    role: s.role,
    perms: s.perms,
    impersonating: !!claims?.impersonated_by,
  };
}
