import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/platform";
import { provisionTenant } from "@/lib/provision";
import { inviteUrl } from "@/lib/invite";
import { withErrorHandler, ApiRouteError } from "@/lib/api/handler";
import { provisionSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

// POST /api/admin/provision { restaurantName, city?, ownerEmail } → new tenant + owner invite link
export const POST = withErrorHandler(async (req: Request) => {
  const admin = await requirePlatformAdmin();
  if (admin instanceof Response) return admin;

  const { restaurantName, city, ownerEmail } = provisionSchema.parse(await req.json());

  // Idempotency guard: don't double-provision on a double submit / retry.
  const dupe = await db.unsafeQuery(
    `SELECT 1 FROM invitations i JOIN roles r ON r.id = i.role_id
      WHERE lower(i.email) = $1 AND r.name = 'owner' AND i.status = 'pending' AND i.expires_at > now()`,
    [ownerEmail],
  );
  if (dupe.rows.length > 0) {
    throw new ApiRouteError("Une invitation propriétaire est déjà en attente pour cet email.", 409);
  }

  const result = await provisionTenant({ restaurantName, city, ownerEmail, invitedBy: admin.userId });

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
});
