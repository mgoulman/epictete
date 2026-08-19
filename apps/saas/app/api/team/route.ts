import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant, enforce } from "@/lib/auth";
import { newInviteToken, inviteUrl, INVITE_ROLES, type InviteRole } from "@/lib/invite";

export const dynamic = "force-dynamic";

// GET /api/team → members + pending invites (tenant-scoped)
export async function GET() {
  return withTenant(async () => {
    const members = (
      await db.query<Record<string, unknown>>(
        `SELECT u.id AS user_id, u.email,
                COALESCE(NULLIF(p.full_name,''), u.email) AS name,
                r.name AS role, m.is_active, m.created_at
           FROM memberships m
           JOIN users u ON u.id = m.user_id
           LEFT JOIN profiles p ON p.id = u.id
           LEFT JOIN roles r ON r.id = m.role_id
          ORDER BY m.created_at`,
      )
    ).rows;
    const invites = (
      await db.query<Record<string, unknown>>(
        `SELECT i.id, i.email, r.name AS role, i.status, i.expires_at, i.created_at,
                (i.expires_at < now()) AS expired
           FROM invitations i
           LEFT JOIN roles r ON r.id = i.role_id
          WHERE i.status = 'pending'
          ORDER BY i.created_at DESC`,
      )
    ).rows;
    return NextResponse.json({ members, invites });
  });
}

// POST /api/team  { email, role } → create a pending invite, return the shareable link
export async function POST(req: Request) {
  const denied = await enforce("users.manage");
  if (denied) return denied;

  return withTenant(async (ctx) => {
    let body: { email?: string; role?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "corps invalide" }, { status: 400 });
    }
    const email = String(body.email ?? "").trim().toLowerCase();
    const role = String(body.role ?? "") as InviteRole;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Email invalide." }, { status: 400 });
    }
    if (!INVITE_ROLES.includes(role)) {
      return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
    }

    // already a member?
    const member = await db.query(
      `SELECT 1 FROM memberships m JOIN users u ON u.id = m.user_id WHERE lower(u.email) = $1`,
      [email],
    );
    if (member.rows.length > 0) {
      return NextResponse.json({ error: "Cette personne fait déjà partie de l’équipe." }, { status: 409 });
    }

    const roleRow = (
      await db.query<{ id: string }>(
        "SELECT id FROM roles WHERE name = $1 AND tenant_id IS NULL LIMIT 1",
        [role],
      )
    ).rows[0];
    if (!roleRow) return NextResponse.json({ error: "Rôle introuvable." }, { status: 400 });

    const token = newInviteToken();
    // supersede any existing pending invite for this email, then insert fresh
    await db.query(
      "UPDATE invitations SET status = 'revoked' WHERE lower(email) = $1 AND status = 'pending'",
      [email],
    );
    await db.query(
      `INSERT INTO invitations (tenant_id, email, role_id, token, invited_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [ctx.tenantId, email, roleRow.id, token, ctx.userId ?? null],
    );
    try {
      await db.query(
        `INSERT INTO analytics_events (tenant_id, user_id, event, props)
         VALUES ($1, $2, 'invite.created', $3::jsonb)`,
        [ctx.tenantId, ctx.userId ?? null, JSON.stringify({ email, role })],
      );
    } catch {
      /* best-effort */
    }

    return NextResponse.json({ ok: true, url: inviteUrl(new URL(req.url).origin, token) });
  });
}

// PATCH /api/team?id=<invitationId> → resend: rotate token (old link dies) + reset expiry
export async function PATCH(req: Request) {
  const denied = await enforce("users.manage");
  if (denied) return denied;

  return withTenant(async () => {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
    const token = newInviteToken();
    const { rows } = await db.query<{ token: string }>(
      `UPDATE invitations
          SET token = $1, expires_at = now() + interval '7 days',
              sent_count = sent_count + 1, updated_at = now()
        WHERE id = $2 AND status = 'pending'
        RETURNING token`,
      [token, id],
    );
    if (rows.length === 0) return NextResponse.json({ error: "Invitation introuvable." }, { status: 404 });
    return NextResponse.json({ ok: true, url: inviteUrl(new URL(req.url).origin, token) });
  });
}

// DELETE /api/team?id=<invitationId> → revoke a pending invite
export async function DELETE(req: Request) {
  const denied = await enforce("users.manage");
  if (denied) return denied;

  return withTenant(async () => {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
    await db.query("UPDATE invitations SET status = 'revoked' WHERE id = $1 AND status = 'pending'", [id]);
    return NextResponse.json({ ok: true });
  });
}
