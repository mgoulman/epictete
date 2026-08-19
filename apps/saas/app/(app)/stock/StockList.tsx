"use client";

import { Package } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { money } from "@/lib/format";

export interface Item {
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
  if (q <= 0) return { tone: "danger" as const, label: "Rupture", rank: 0 };
  if (min > 0 && q <= min) return { tone: "warning" as const, label: "Stock bas", rank: 1 };
  return { tone: "positive" as const, label: "OK", rank: 2 };
}

export function StockList({ items }: { items: Item[] }) {
  const cols: DataColumn<Item>[] = [
    { key: "name", header: "Produit", sortable: true, sortValue: (i) => i.name.toLowerCase(), render: (i) => <span className="font-medium">{i.name}</span> },
    { key: "category", header: "Catégorie", sortable: true, sortValue: (i) => i.category ?? "", render: (i) => i.category ?? "—" },
    { key: "quantity", header: "Quantité", numeric: true, sortable: true, sortValue: (i) => Number(i.quantity), render: (i) => `${Number(i.quantity)} ${i.unit}` },
    { key: "min", header: "Seuil", numeric: true, render: (i) => Number(i.minimum_stock) || "—" },
    { key: "price", header: "Dernier prix", numeric: true, sortable: true, sortValue: (i) => Number(i.last_purchase_price), render: (i) => money(i.last_purchase_price) },
    {
      key: "status",
      header: "Statut",
      align: "center",
      sortable: true,
      sortValue: (i) => status(i).rank,
      render: (i) => {
        const s = status(i);
        return <Badge tone={s.tone}>{s.label}</Badge>;
      },
    },
  ];

  return (
    <DataTable
      columns={cols}
      rows={items}
      rowKey={(i) => i.id}
      getSearchText={(i) => `${i.name} ${i.category ?? ""}`}
      searchPlaceholder="Rechercher un produit…"
      empty={
        <div className="flex flex-col items-center gap-2 py-6">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius)] bg-[var(--color-secondary)] text-[var(--color-muted-foreground)]">
            <Package className="h-5 w-5" />
          </span>
          <div className="font-medium text-[var(--color-foreground)]">Aucun produit pour l’instant</div>
          <div className="text-sm text-[var(--color-muted-foreground)]">Ajoutez votre premier produit pour suivre votre stock.</div>
        </div>
      }
    />
  );
}
