import { NextResponse } from "next/server";
import { runWithTenant } from "@epictete/core/db";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/platform";
import { withErrorHandler, ApiRouteError } from "@/lib/api/handler";

export const dynamic = "force-dynamic";

// GET /api/admin/tenants/export?tenantId= → full JSON export of a tenant's data
// (data-portability / pre-deletion). Platform admin only; read inside the tenant context (RLS-scoped).
export const GET = withErrorHandler(async (req: Request) => {
  const admin = await requirePlatformAdmin();
  if (admin instanceof Response) return admin;
  const tenantId = new URL(req.url).searchParams.get("tenantId");
  if (!tenantId) throw new ApiRouteError("tenantId requis", 400);

  const result = await runWithTenant({ tenantId }, async () => {
    const tenant = (await db.query("SELECT * FROM tenants LIMIT 1")).rows[0];
    if (!tenant) return null;
    const dump = async (table: string) => (await db.query(`SELECT * FROM ${table}`)).rows;
    const members = (
      await db.query(
        `SELECT u.email, COALESCE(p.full_name, u.email) AS name, r.name AS role, m.is_active
           FROM memberships m JOIN users u ON u.id = m.user_id
           LEFT JOIN profiles p ON p.id = u.id LEFT JOIN roles r ON r.id = m.role_id`,
      )
    ).rows;
    return {
      exported_at: new Date().toISOString(),
      exported_by: admin.email,
      tenant,
      members,
      branches: await dump("branches"),
      cash_sheets: await dump("cash_sheets"),
      expenses: await dump("expenses"),
      inventory_items: await dump("inventory_items"),
      vendors: await dump("vendors"),
      vendor_transactions: await dump("vendor_transactions"),
      staff_members: await dump("staff_members"),
      attendance: await dump("attendance"),
    };
  });

  if (!result) throw new ApiRouteError("Restaurant introuvable.", 404);

  const slug = (result.tenant as { slug?: string }).slug ?? "tenant";
  return new NextResponse(JSON.stringify(result, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="epictete-${slug}-export.json"`,
    },
  });
});
