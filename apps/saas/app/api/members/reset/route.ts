import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant, enforce } from "@/lib/auth";
import { withErrorHandler, ApiRouteError } from "@/lib/api/handler";
import { createResetForUser, resetUrl } from "@/lib/reset";

export const dynamic = "force-dynamic";

// POST /api/members/reset?userId= → owner generates a reset link for a member.
export const POST = withErrorHandler(async (req: Request) => {
  const denied = await enforce("users.manage");
  if (denied) return denied;
  return withTenant(async (ctx) => {
    const userId = new URL(req.url).searchParams.get("userId");
    if (!userId) throw new ApiRouteError("userId requis", 400);
    if (userId === ctx.userId) throw new ApiRouteError("Utilisez « Mon compte » pour votre propre mot de passe.", 400);
    // must be a member of THIS tenant (RLS-scoped), and not the owner
    const { rows } = await db.query<{ role: string | null }>(
      `SELECT r.name AS role FROM memberships m LEFT JOIN roles r ON r.id = m.role_id WHERE m.user_id = $1`,
      [userId],
    );
    if (rows.length === 0) throw new ApiRouteError("Membre introuvable.", 404);
    if (rows[0].role === "owner") throw new ApiRouteError("Le propriétaire ne peut pas être réinitialisé ici.", 403);
    const token = await createResetForUser(userId, ctx.userId ?? null);
    return NextResponse.json({ ok: true, url: resetUrl(new URL(req.url).origin, token) });
  });
});
