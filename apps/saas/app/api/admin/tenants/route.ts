import { NextResponse } from "next/server";
import { runWithTenant } from "@epictete/core/db";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/platform";

export const dynamic = "force-dynamic";

// GET /api/admin/tenants → all tenants with headline stats (cross-tenant → SECURITY DEFINER fn)
export async function GET() {
  const admin = await requirePlatformAdmin();
  if (admin instanceof Response) return admin;
  const { rows } = await db.unsafeQuery<Record<string, unknown>>("SELECT * FROM plt_tenants_overview()");
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
  // The tenant is known → RLS-scoped write in its own context (policy allows the own row).
  await runWithTenant({ tenantId: id, userId: admin.userId }, async () => {
    await db.query("UPDATE tenants SET status = $1, updated_at = now() WHERE id = $2", [status, id]);
    try {
      await db.query(
        `INSERT INTO analytics_events (tenant_id, user_id, event, props) VALUES ($1,$2,'tenant.status_changed',$3::jsonb)`,
        [id, admin.userId, JSON.stringify({ status })],
      );
    } catch { /* best-effort */ }
  });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/tenants?id= → permanently delete a tenant + all its data (cascade).
export async function DELETE(req: Request) {
  const admin = await requirePlatformAdmin();
  if (admin instanceof Response) return admin;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  const { rowCount } = await runWithTenant({ tenantId: id }, () =>
    db.query("DELETE FROM tenants WHERE id = $1", [id]),
  );
  if (!rowCount) return NextResponse.json({ error: "Restaurant introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
