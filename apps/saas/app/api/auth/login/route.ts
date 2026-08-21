import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signSaasJWT, signPlatformJWT } from "@epictete/core/auth";
import { SAAS_COOKIE } from "@/lib/tenant";
import { PLATFORM_COOKIE } from "@/lib/platform";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

export const dynamic = "force-dynamic";

/**
 * SaaS login. Verifies email/password (Postgres crypt(), same as the restaurant app),
 * resolves the user's active membership → tenant + role, and mints a saas_token JWT
 * carrying { sub, tenant_id, tenant_slug, role }. MVP: a user has one active tenant;
 * multi-tenant membership + a tenant chooser is a Phase-2 concern.
 */
export async function POST(req: Request) {
  let email: string, password: string;
  try {
    const body = await req.json();
    email = String(body.email ?? "").trim().toLowerCase();
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
  }

  const { rows: users } = await db.unsafeQuery<{ id: string; is_platform_admin: boolean }>(
    "SELECT id, is_platform_admin FROM users WHERE email = $1 AND password_hash = crypt($2, password_hash)",
    [email, password],
  );
  if (users.length === 0) {
    return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
  }
  const userId = users[0].id;

  // Platform (super) admin → cross-tenant console, no tenant membership required.
  if (users[0].is_platform_admin) {
    const token = await signPlatformJWT({ sub: userId, platform_admin: true });
    const res = NextResponse.json({ ok: true, redirect: "/admin" });
    res.cookies.set(PLATFORM_COOKIE, token, COOKIE_OPTS);
    return res;
  }

  // Context-less lookup (we don't know the tenant yet) → SECURITY DEFINER function.
  const { rows: memberships } = await db.unsafeQuery<{
    tenant_id: string;
    slug: string;
    role: string | null;
  }>("SELECT tenant_id, slug, role FROM plt_login($1)", [userId]);
  if (memberships.length === 0) {
    return NextResponse.json(
      { error: "Aucun restaurant actif associé à ce compte." },
      { status: 403 },
    );
  }
  const m = memberships[0];

  const token = await signSaasJWT({
    sub: userId,
    tenant_id: m.tenant_id,
    tenant_slug: m.slug,
    role: m.role ?? undefined,
  });

  const res = NextResponse.json({ ok: true, redirect: "/dashboard" });
  res.cookies.set(SAAS_COOKIE, token, COOKIE_OPTS);
  return res;
}
