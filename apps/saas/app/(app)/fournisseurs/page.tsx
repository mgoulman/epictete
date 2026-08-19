import { redirect } from "next/navigation";
import { runWithTenant } from "@epictete/core/db";
import { db } from "@/lib/db";
import { resolveTenant } from "@/lib/tenant";
import { getSaasSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { VendorsManager, type Vendor } from "./VendorsManager";

export const dynamic = "force-dynamic";

export default async function FournisseursPage() {
  const [ctx, session] = await Promise.all([resolveTenant(), getSaasSession()]);
  if (!ctx) redirect("/login");
  const canWrite = session?.role === "owner" || session?.role === "admin" || (session?.perms.includes("inventory.write") ?? false);

  const vendors = await runWithTenant({ tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role }, async () =>
    (
      await db.query<Vendor>(
        `SELECT v.id, v.name, v.contact_name, v.phone, v.category,
                COALESCE(SUM(CASE WHEN t.type='debt' THEN t.amount WHEN t.type='payment' THEN -t.amount ELSE 0 END), 0)::numeric AS solde
           FROM vendors v
           LEFT JOIN vendor_transactions t ON t.vendor_id = v.id
          GROUP BY v.id
          ORDER BY v.name`,
      )
    ).rows,
  );

  return (
    <>
      <PageHeader title="Fournisseurs" subtitle="Vos fournisseurs et ce que vous leur devez." />
      <VendorsManager vendors={vendors} canWrite={canWrite} />
    </>
  );
}
