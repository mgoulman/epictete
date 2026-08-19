import { redirect } from "next/navigation";
import { runWithTenant } from "@epictete/core/db";
import { db } from "@/lib/db";
import { resolveTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/PageHeader";
import { StockList, type Item } from "./StockList";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const ctx = await resolveTenant();
  if (!ctx) redirect("/login");

  const items = await runWithTenant({ tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role }, async () =>
    (
      await db.query<Item>(
        `SELECT id, name, category, quantity, unit, minimum_stock, last_purchase_price
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
      <StockList items={items} />
    </>
  );
}
