import { redirect } from "next/navigation";
import { runWithTenant } from "@epictete/core/db";
import { db } from "@/lib/db";
import { resolveTenant } from "@/lib/tenant";
import { getSaasSession } from "@/lib/auth";
import { RestaurantForm, type RestaurantProfile } from "./RestaurantForm";

export const dynamic = "force-dynamic";

export default async function RestaurantSettingsPage() {
  const [ctx, session] = await Promise.all([resolveTenant(), getSaasSession()]);
  if (!ctx) redirect("/login");

  const data = await runWithTenant({ tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role }, async () => {
    const tenant = (
      await db.query<Record<string, unknown>>(
        "SELECT slug, name, city, ice, rc, billing_email FROM tenants LIMIT 1",
      )
    ).rows[0];
    const branch = (
      await db.query<{ name: string }>("SELECT name FROM branches ORDER BY is_default DESC, name LIMIT 1")
    ).rows[0];
    return { tenant, branch };
  });

  const profile: RestaurantProfile = {
    name: String(data.tenant?.name ?? ""),
    slug: String(data.tenant?.slug ?? ""),
    city: String(data.tenant?.city ?? ""),
    ice: String(data.tenant?.ice ?? ""),
    rc: String(data.tenant?.rc ?? ""),
    billing_email: String(data.tenant?.billing_email ?? ""),
    branch_name: String(data.branch?.name ?? ""),
  };

  const canEdit =
    session?.role === "owner" ||
    session?.role === "admin" ||
    (session?.perms.includes("settings.manage") ?? false);

  return <RestaurantForm initial={profile} canEdit={canEdit} />;
}
