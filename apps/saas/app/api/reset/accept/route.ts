import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandler, ApiRouteError } from "@/lib/api/handler";
import { resetPasswordSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

// POST /api/reset/accept { token, password } → set a new password via a valid reset token.
export const POST = withErrorHandler(async (req: Request) => {
  const { token, password } = resetPasswordSchema.parse(await req.json());
  const { rows } = await db.unsafeQuery<{ id: string; user_id: string; expired: boolean; used: boolean }>(
    `SELECT id, user_id, (expires_at < now()) AS expired, (used_at IS NOT NULL) AS used
       FROM password_resets WHERE token = $1`,
    [token],
  );
  const r = rows[0];
  if (!r) throw new ApiRouteError("Ce lien n’est pas valide.", 404);
  if (r.used) throw new ApiRouteError("Ce lien a déjà été utilisé.", 410);
  if (r.expired) throw new ApiRouteError("Ce lien a expiré.", 410);

  await db.unsafeQuery("UPDATE users SET password_hash=crypt($1, gen_salt('bf')), updated_at=now() WHERE id=$2", [password, r.user_id]);
  await db.unsafeQuery("UPDATE password_resets SET used_at=now() WHERE id=$1", [r.id]);
  return NextResponse.json({ ok: true, redirect: "/login" });
});
