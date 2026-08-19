import { redirect } from "next/navigation";
import { runWithTenant } from "@epictete/core/db";
import { db } from "@/lib/db";
import { resolveTenant } from "@/lib/tenant";
import { getSaasSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { InventoryManager, type Item } from "./InventoryManager";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const [ctx, session] = await Promise.all([resolveTenant(), getSaasSession()]);
  if (!ctx) redirect("/login");

  const canWrite =
    session?.role === "owner" || session?.role === "admin" || (session?.perms.includes("inventory.write") ?? false);

  const items = await runWithTenant({ tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role }, async () =>
    (
      await db.query<Item>(
        `SELECT id, name, category, quantity, unit, minimum_stock, cost_per_unit, last_purchase_price
           FROM inventory_items ORDER BY name`,
      )
    ).rows,
  );

  const low = items.filter((i) => Number(i.quantity) <= 0 || (Number(i.minimum_stock) > 0 && Number(i.quantity) <= Number(i.minimum_stock))).length;

  return (
    <>
      <PageHeader
        title="Inventaire"
        subtitle={`${items.length} produit${items.length > 1 ? "s" : ""}${low > 0 ? ` · ${low} à réapprovisionner` : ""}`}
      />
      <InventoryManager items={items} canWrite={canWrite} />
    </>
  );
}
