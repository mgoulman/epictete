import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/auth";

export const dynamic = "force-dynamic"; // reads the session cookie

// Tenant-scoped snapshot. Uses withTenant → inherits auth + per-request suspension gating.
export async function GET() {
  return withTenant(async () => {
    const tenant = (await db.query("select id, slug, name, status from tenants")).rows[0] ?? null;
    const branches = (await db.query("select id, name, is_default from branches order by name")).rows;
    const memberCount = (await db.query<{ n: number }>("select count(*)::int n from memberships")).rows[0].n;
    const menus = await db.from("menus").select("*");
    return NextResponse.json({
      tenant,
      branches,
      memberCount,
      menuCount: Array.isArray(menus.data) ? menus.data.length : null,
    });
  });
}
