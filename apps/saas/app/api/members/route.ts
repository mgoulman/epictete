import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant, enforce } from "@/lib/auth";
import { withErrorHandler, ApiRouteError } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

const MEMBER_ROLES = ["manager", "cashier"];

async function guardTarget(userId: string, selfId?: string) {
  if (userId === selfId) throw new ApiRouteError("Vous ne pouvez pas modifier votre propre accès.", 400);
  const { rows } = await db.query<{ role: string | null }>(
    `SELECT r.name AS role FROM memberships m LEFT JOIN roles r ON r.id = m.role_id WHERE m.user_id = $1`,
    [userId],
  );
  if (rows.length === 0) throw new ApiRouteError("Membre introuvable.", 404);
  if (rows[0].role === "owner") throw new ApiRouteError("Le propriétaire ne peut pas être modifié.", 403);
}

// PATCH /api/members?userId=  { role } | { is_active }
export const PATCH = withErrorHandler(async (req: Request) => {
  const denied = await enforce("users.manage");
  if (denied) return denied;
  return withTenant(async (ctx) => {
    const userId = new URL(req.url).searchParams.get("userId");
    if (!userId) throw new ApiRouteError("userId requis", 400);
    const body = (await req.json().catch(() => ({}))) as { role?: string; is_active?: boolean };
    await guardTarget(userId, ctx.userId);

    if (body.role !== undefined) {
      if (!MEMBER_ROLES.includes(body.role)) throw new ApiRouteError("Rôle invalide.", 400);
      const role = (await db.query<{ id: string }>("SELECT id FROM roles WHERE name=$1 AND tenant_id IS NULL LIMIT 1", [body.role])).rows[0];
      if (!role) throw new ApiRouteError("Rôle introuvable.", 400);
      await db.query("UPDATE memberships SET role_id=$1 WHERE tenant_id=$2 AND user_id=$3", [role.id, ctx.tenantId, userId]);
    }
    if (body.is_active !== undefined) {
      await db.query("UPDATE memberships SET is_active=$1 WHERE tenant_id=$2 AND user_id=$3", [!!body.is_active, ctx.tenantId, userId]);
    }
    return NextResponse.json({ ok: true });
  });
});

// DELETE /api/members?userId= → remove the member from this tenant
export const DELETE = withErrorHandler(async (req: Request) => {
  const denied = await enforce("users.manage");
  if (denied) return denied;
  return withTenant(async (ctx) => {
    const userId = new URL(req.url).searchParams.get("userId");
    if (!userId) throw new ApiRouteError("userId requis", 400);
    await guardTarget(userId, ctx.userId);
    await db.query("DELETE FROM memberships WHERE tenant_id=$1 AND user_id=$2", [ctx.tenantId, userId]);
    return NextResponse.json({ ok: true });
  });
});
