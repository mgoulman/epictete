import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/platform";

export const dynamic = "force-dynamic";

// GET /api/admin/tenants → all tenants with headline stats (platform-level)
export async function GET() {
  const admin = await requirePlatformAdmin();
  if (admin instanceof Response) return admin;

  const { rows } = await db.unsafeQuery<Record<string, unknown>>(
    `SELECT t.id, t.name, t.slug, t.city, t.status, t.created_at,
            (SELECT count(*)::int FROM memberships m WHERE m.tenant_id = t.id AND m.is_active) AS members,
            (SELECT count(*)::int FROM cash_sheets c WHERE c.tenant_id = t.id) AS cash_sheets,
            EXISTS (SELECT 1 FROM memberships m JOIN roles r ON r.id = m.role_id
                     WHERE m.tenant_id = t.id AND r.name = 'owner' AND m.is_active) AS has_owner
       FROM tenants t
      ORDER BY t.created_at DESC`,
  );
  return NextResponse.json({ tenants: rows });
}

// PATCH /api/admin/tenants?id=&status= → suspend / reactivate / offboard a tenant
export async function PATCH(req: Request) {
  const admin = await requirePlatformAdmin();
  if (admin instanceof Response) return admin;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const status = url.searchParams.get("status");
  if (!id || !status) return NextResponse.json({ error: "id + status requis" }, { status: 400 });
  if (!["active", "suspended", "offboarding"].includes(status)) {
    return NextResponse.json({ error: "statut invalide" }, { status: 400 });
  }
  await db.unsafeQuery("UPDATE tenants SET status = $1, updated_at = now() WHERE id = $2", [status, id]);
  try {
    await db.unsafeQuery(
      `INSERT INTO analytics_events (tenant_id, user_id, event, props) VALUES ($1,$2,'tenant.status_changed',$3::jsonb)`,
      [id, admin.userId, JSON.stringify({ status })],
    );
  } catch {
    /* best-effort */
  }
  return NextResponse.json({ ok: true });
}
