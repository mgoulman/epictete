import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSaasSession } from "@/lib/auth";
import { withErrorHandler, ApiRouteError } from "@/lib/api/handler";
import { accountSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

// PATCH /api/account { name?, current_password?, new_password? } → update own profile / password.
// Identity tables (profiles/users) are global (no tenant RLS) → unsafeQuery.
export const PATCH = withErrorHandler(async (req: Request) => {
  const session = await getSaasSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = accountSchema.parse(await req.json());

  if (b.name) {
    await db.unsafeQuery("UPDATE profiles SET full_name=$1, updated_at=now() WHERE id=$2", [b.name, session.userId]);
  }
  if (b.new_password) {
    if (!b.current_password) throw new ApiRouteError("Mot de passe actuel requis.", 400);
    const ok = await db.unsafeQuery(
      "SELECT 1 FROM users WHERE id=$1 AND password_hash=crypt($2, password_hash)",
      [session.userId, b.current_password],
    );
    if (ok.rows.length === 0) throw new ApiRouteError("Mot de passe actuel incorrect.", 401);
    await db.unsafeQuery(
      "UPDATE users SET password_hash=crypt($1, gen_salt('bf')), updated_at=now() WHERE id=$2",
      [b.new_password, session.userId],
    );
  }
  return NextResponse.json({ ok: true });
});
