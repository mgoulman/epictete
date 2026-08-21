import { NextResponse } from "next/server";
import { runWithTenant } from "@epictete/core/db";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/platform";
import { withErrorHandler, ApiRouteError } from "@/lib/api/handler";
import { signSaasJWT } from "@epictete/core/auth";
import { SAAS_COOKIE } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const COOKIE_OPTS = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 4 };

// POST /api/admin/impersonate?tenantId= → platform admin views a tenant as its owner.
// Keeps the admin cookie so they can exit; the token carries impersonated_by for the banner + audit.
export const POST = withErrorHandler(async (req: Request) => {
  const admin = await requirePlatformAdmin();
  if (admin instanceof Response) return admin;
  const tenantId = new URL(req.url).searchParams.get("tenantId");
  if (!tenantId) throw new ApiRouteError("tenantId requis", 400);

  // Known tenant → RLS-scoped read inside its context.
  const { rows } = await runWithTenant({ tenantId }, () =>
    db.query<{ user_id: string; slug: string }>(
      `SELECT m.user_id, t.slug
         FROM memberships m
         JOIN roles r ON r.id = m.role_id
         JOIN tenants t ON t.id = m.tenant_id
        WHERE r.name = 'owner' AND m.is_active = true
        LIMIT 1`,
    ),
  );
  if (rows.length === 0) throw new ApiRouteError("Ce restaurant n’a pas encore de propriétaire actif.", 409);

  const token = await signSaasJWT({
    sub: rows[0].user_id,
    tenant_id: tenantId,
    tenant_slug: rows[0].slug,
    role: "owner",
    impersonated_by: admin.userId,
  });
  try {
    await runWithTenant({ tenantId, userId: admin.userId }, () =>
      db.query(
        `INSERT INTO analytics_events (tenant_id, user_id, event, props) VALUES ($1,$2,'tenant.impersonated',$3::jsonb)`,
        [tenantId, admin.userId, JSON.stringify({ by: admin.email })],
      ),
    );
  } catch { /* best-effort */ }

  const res = NextResponse.json({ ok: true, redirect: "/dashboard" });
  res.cookies.set(SAAS_COOKIE, token, COOKIE_OPTS);
  return res;
});

// DELETE /api/admin/impersonate → stop impersonating (clear the tenant token, keep admin session).
export const DELETE = withErrorHandler(async () => {
  const res = NextResponse.json({ ok: true, redirect: "/admin" });
  res.cookies.set(SAAS_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
});
