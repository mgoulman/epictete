import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/platform";
import { withErrorHandler, ApiRouteError } from "@/lib/api/handler";
import { createResetForUser, resetUrl } from "@/lib/reset";

export const dynamic = "force-dynamic";

// POST /api/admin/reset { email } → platform admin generates a reset link for any user
// (e.g. an owner who forgot their password).
export const POST = withErrorHandler(async (req: Request) => {
  const admin = await requirePlatformAdmin();
  if (admin instanceof Response) return admin;
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  const clean = String(email ?? "").trim().toLowerCase();
  if (!clean) throw new ApiRouteError("Email requis.", 400);
  const { rows } = await db.unsafeQuery<{ id: string }>("SELECT id FROM users WHERE lower(email)=$1", [clean]);
  if (rows.length === 0) throw new ApiRouteError("Aucun compte pour cet email.", 404);
  const token = await createResetForUser(rows[0].id, admin.userId);
  return NextResponse.json({ ok: true, url: resetUrl(new URL(req.url).origin, token) });
});
