import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signSaasJWT } from "@epictete/core/auth";
import { SAAS_COOKIE } from "@/lib/tenant";

export const dynamic = "force-dynamic";

interface InviteRow {
  id: string;
  tenant_id: string;
  slug: string;
  email: string;
  role_id: string;
  role: string | null;
  status: string;
  expired: boolean;
}

// Platform-level lookup — no tenant context exists yet (unsafeQuery bypasses RLS in dev;
// prod hardening = a SECURITY DEFINER fn, per the 0009 migration note).
async function loadInvite(token: string): Promise<InviteRow | null> {
  const { rows } = await db.unsafeQuery<InviteRow>(
    `SELECT i.id, i.tenant_id, t.slug, i.email, i.role_id, r.name AS role, i.status,
            (i.expires_at < now()) AS expired
       FROM invitations i
       JOIN tenants t ON t.id = i.tenant_id
       LEFT JOIN roles r ON r.id = i.role_id
      WHERE i.token = $1`,
    [token],
  );
  return rows[0] ?? null;
}

export async function POST(req: Request) {
  let body: { token?: string; name?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "corps invalide" }, { status: 400 });
  }
  const token = String(body.token ?? "");
  const name = String(body.name ?? "").trim();
  const password = String(body.password ?? "");
  if (!token) return NextResponse.json({ error: "Lien invalide." }, { status: 400 });

  const invite = await loadInvite(token);
  if (!invite) return NextResponse.json({ error: "Ce lien d’invitation n’est pas valide." }, { status: 404 });
  if (invite.status === "revoked") return NextResponse.json({ error: "Cette invitation a été annulée." }, { status: 410 });
  if (invite.status === "accepted") return NextResponse.json({ error: "Cette invitation a déjà été utilisée." }, { status: 410 });
  if (invite.expired) return NextResponse.json({ error: "Ce lien a expiré. Demandez une nouvelle invitation." }, { status: 410 });

  const email = invite.email.toLowerCase();
  const existing = (
    await db.unsafeQuery<{ id: string }>("SELECT id FROM users WHERE lower(email) = $1", [email])
  ).rows[0];

  let userId: string;
  if (existing) {
    // existing account → verify password to confirm identity, then attach membership
    if (!password) return NextResponse.json({ error: "Mot de passe requis." }, { status: 400 });
    const ok = (
      await db.unsafeQuery<{ id: string }>(
        "SELECT id FROM users WHERE id = $1 AND password_hash = crypt($2, password_hash)",
        [existing.id, password],
      )
    ).rows[0];
    if (!ok) return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
    userId = existing.id;
  } else {
    if (!name) return NextResponse.json({ error: "Votre nom est requis." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Mot de passe : 8 caractères minimum." }, { status: 400 });
    userId = (
      await db.unsafeQuery<{ id: string }>(
        "INSERT INTO users (email, password_hash) VALUES ($1, crypt($2, gen_salt('bf'))) RETURNING id",
        [email, password],
      )
    ).rows[0].id;
    await db.unsafeQuery(
      "INSERT INTO profiles (id, email, full_name) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name",
      [userId, email, name],
    );
  }

  // attach (or re-activate) the membership + consume the invite
  await db.unsafeQuery(
    `INSERT INTO memberships (tenant_id, user_id, role_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id, user_id) DO UPDATE SET is_active = true, role_id = EXCLUDED.role_id`,
    [invite.tenant_id, userId, invite.role_id],
  );
  await db.unsafeQuery(
    "UPDATE invitations SET status = 'accepted', accepted_at = now(), accepted_by = $2, updated_at = now() WHERE id = $1",
    [invite.id, userId],
  );
  try {
    await db.unsafeQuery(
      `INSERT INTO analytics_events (tenant_id, user_id, event, props) VALUES
         ($1, $2, 'invite.accepted', $3::jsonb),
         ($1, $2, 'consent.accepted', $4::jsonb)`,
      [
        invite.tenant_id,
        userId,
        JSON.stringify({ role: invite.role }),
        JSON.stringify({ version: "pilot-2026-08", via: "invite" }),
      ],
    );
  } catch {
    /* best-effort */
  }

  const jwt = await signSaasJWT({
    sub: userId,
    tenant_id: invite.tenant_id,
    tenant_slug: invite.slug,
    role: invite.role ?? undefined,
  });
  const res = NextResponse.json({ ok: true, redirect: "/dashboard" });
  res.cookies.set(SAAS_COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
