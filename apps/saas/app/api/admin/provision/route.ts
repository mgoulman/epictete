import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/platform";
import { provisionTenant } from "@/lib/provision";
import { inviteUrl } from "@/lib/invite";

export const dynamic = "force-dynamic";

// POST /api/admin/provision { restaurantName, city?, ownerEmail } → new tenant + owner invite link
export async function POST(req: Request) {
  const admin = await requirePlatformAdmin();
  if (admin instanceof Response) return admin;

  let b: { restaurantName?: string; city?: string; ownerEmail?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "corps invalide" }, { status: 400 });
  }
  const restaurantName = String(b.restaurantName ?? "").trim();
  const ownerEmail = String(b.ownerEmail ?? "").trim().toLowerCase();
  if (!restaurantName) return NextResponse.json({ error: "Nom du restaurant requis." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ownerEmail)) {
    return NextResponse.json({ error: "Email du propriétaire invalide." }, { status: 400 });
  }

  const result = await provisionTenant({
    restaurantName,
    city: b.city,
    ownerEmail,
    invitedBy: admin.userId,
  });

  try {
    await db.unsafeQuery(
      `INSERT INTO analytics_events (tenant_id, user_id, event, props)
       VALUES ($1, $2, 'tenant.provisioned', $3::jsonb)`,
      [result.tenantId, admin.userId, JSON.stringify({ slug: result.slug, ownerEmail })],
    );
  } catch {
    /* best-effort */
  }

  return NextResponse.json({
    ok: true,
    tenant: { id: result.tenantId, slug: result.slug, name: restaurantName },
    ownerEmail,
    url: inviteUrl(new URL(req.url).origin, result.token),
  });
}
