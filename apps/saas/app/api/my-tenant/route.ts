import { NextResponse } from "next/server";
import { runWithTenant } from "@epictete/core/db";
import { db } from "@/lib/db";
import { resolveTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic"; // reads the session cookie

// End-to-end proof of the request-boundary wiring: JWT (with tenant_id) -> tenant
// context -> runWithTenant -> RLS-scoped db layer. Returns ONLY the caller's tenant.
export async function GET() {
  const ctx = await resolveTenant();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  return runWithTenant(ctx, async () => {
    const tenant = (await db.query("select id, slug, name, status from tenants")).rows[0] ?? null;
    const branches = (await db.query("select id, name, is_default from branches order by name")).rows;
    const memberCount = (await db.query<{ n: number }>("select count(*)::int n from memberships")).rows[0].n;
    // Exercise the shared Supabase-compat BUILDER (tenant-scoped via RLS):
    const menus = await db.from("menus").select("*");
    return NextResponse.json({
      tenant,
      branches,
      memberCount,
      menuCount: Array.isArray(menus.data) ? menus.data.length : null,
    });
  });
}
