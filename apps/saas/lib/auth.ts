import { NextResponse } from "next/server";
import { runWithTenant, type TenantContext } from "@epictete/core/db";
import { db } from "@/lib/db";
import { resolveTenant } from "@/lib/tenant";

/**
 * The SaaS request boundary for API routes. Resolves the tenant context from the
 * session cookie, then runs the handler inside runWithTenant so the shared db
 * layer is RLS-scoped for the whole request. Replies 401 when unauthenticated.
 *
 *   export const GET = () => withTenant(async (ctx) => {
 *     const rows = (await db.from("cash_sheets").select("*"));
 *     return NextResponse.json(rows.data);
 *   });
 */
export async function withTenant(
  handler: (ctx: TenantContext) => Promise<Response>,
): Promise<Response> {
  const ctx = await resolveTenant();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return runWithTenant(ctx, () => handler(ctx));
}

export interface SaasSession {
  userId: string;
  tenantId: string;
  role: string | null;
  perms: string[];
}

/**
 * Full session (tenant-scoped): the active membership's role + its permissions.
 * Resolved from the DB (memberships -> role -> role_permissions) using unsafeQuery
 * (platform-level) with an explicit tenant filter, since we're establishing the
 * very context RLS would otherwise need. `null` when unauthenticated.
 */
export async function getSaasSession(): Promise<SaasSession | null> {
  const ctx = await resolveTenant();
  if (!ctx) return null;
  const { rows } = await db.unsafeQuery<{ role: string | null; perm: string | null }>(
    `SELECT r.name AS role, p.name AS perm
       FROM memberships m
       LEFT JOIN roles r ON r.id = m.role_id
       LEFT JOIN role_permissions rp ON rp.role_id = m.role_id
       LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE m.tenant_id = $1 AND m.user_id = $2 AND m.is_active = true`,
    [ctx.tenantId, ctx.userId],
  );
  if (rows.length === 0) return null;
  return {
    userId: ctx.userId!,
    tenantId: ctx.tenantId,
    role: rows[0].role,
    perms: rows.map((r) => r.perm).filter((p): p is string => !!p),
  };
}

/**
 * Permission gate for a tenant-scoped route. The tenant "owner"/"admin" role is a
 * god WITHIN its tenant (still bounded by RLS); platform-admin is a separate gate
 * handled elsewhere. Returns a 403 Response when denied, or null when allowed.
 */
export async function enforce(permission?: string): Promise<Response | null> {
  const session = await getSaasSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.role === "owner" || session.role === "admin") return null; // tenant-god
  if (permission && !session.perms.includes(permission)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}
