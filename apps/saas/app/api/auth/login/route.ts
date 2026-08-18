import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signSaasJWT } from "@epictete/core/auth";
import { SAAS_COOKIE } from "@/lib/tenant";

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

  const { rows: users } = await db.unsafeQuery<{ id: string }>(
    "SELECT id FROM users WHERE email = $1 AND password_hash = crypt($2, password_hash)",
    [email, password],
  );
  if (users.length === 0) {
    return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
  }
  const userId = users[0].id;

  const { rows: memberships } = await db.unsafeQuery<{
    tenant_id: string;
    slug: string;
    role: string | null;
  }>(
    `SELECT m.tenant_id, t.slug, r.name AS role
       FROM memberships m
       JOIN tenants t ON t.id = m.tenant_id
       LEFT JOIN roles r ON r.id = m.role_id
      WHERE m.user_id = $1 AND m.is_active = true AND t.status = 'active'
      ORDER BY m.created_at
      LIMIT 1`,
    [userId],
  );
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

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SAAS_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
