import { redirect } from "next/navigation";
import { Package, Plus } from "lucide-react";
import { runWithTenant } from "@epictete/core/db";
import { db } from "@/lib/db";
import { resolveTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, type Column } from "@/components/ui/Table";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

interface Item {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string;
  minimum_stock: number;
  last_purchase_price: number;
}

function status(i: Item) {
  const q = Number(i.quantity);
  const min = Number(i.minimum_stock);
  if (q <= 0) return { tone: "danger" as const, label: "Rupture" };
  if (min > 0 && q <= min) return { tone: "warning" as const, label: "Stock bas" };
  return { tone: "positive" as const, label: "OK" };
}

export default async function StockPage() {
  const ctx = await resolveTenant();
  if (!ctx) redirect("/login");

  const items = await runWithTenant({ tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role }, async () => {
    try {
      return (
        await db.query<Item>(
          `SELECT id, name, category, quantity, unit, minimum_stock, last_purchase_price
             FROM inventory_items ORDER BY name`,
        )
      ).rows;
    } catch {
      return [];
    }
  });

  const low = items.filter((i) => status(i).tone !== "positive").length;

  const columns: Column<Item>[] = [
    { key: "name", header: "Produit", render: (i) => <span className="font-medium">{i.name}</span> },
    { key: "category", header: "Catégorie", render: (i) => i.category ?? "—" },
    { key: "quantity", header: "Quantité", numeric: true, render: (i) => `${Number(i.quantity)} ${i.unit}` },
    { key: "min", header: "Seuil", numeric: true, render: (i) => Number(i.minimum_stock) || "—" },
    { key: "price", header: "Dernier prix", numeric: true, render: (i) => money(i.last_purchase_price) },
    {
      key: "status",
      header: "Statut",
      align: "center",
      render: (i) => {
        const s = status(i);
        return <Badge tone={s.tone}>{s.label}</Badge>;
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Inventaire"
        subtitle={`${items.length} produit${items.length > 1 ? "s" : ""}${low > 0 ? ` · ${low} à réapprovisionner` : ""}`}
        action={
          <Button>
            <Plus className="h-4 w-4" /> Ajouter un produit
          </Button>
        }
      />
      <Table
        columns={columns}
        rows={items}
        rowKey={(i) => i.id}
        empty={
          <div className="flex flex-col items-center gap-2 py-6">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius)] bg-[var(--color-secondary)] text-[var(--color-muted-foreground)]">
              <Package className="h-5 w-5" />
            </span>
            <div className="font-medium text-[var(--color-foreground)]">Aucun produit pour l’instant</div>
            <div className="text-sm text-[var(--color-muted-foreground)]">
              Ajoutez votre premier produit pour suivre votre stock.
            </div>
          </div>
        }
      />
    </>
  );
}
