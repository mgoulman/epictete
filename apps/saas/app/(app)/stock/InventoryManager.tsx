"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { FormField, TextInput, MoneyInput } from "@/components/ui/Field";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { fetchJson, ApiError } from "@/lib/api/fetch-json";
import { inventoryItemSchema } from "@/lib/schemas";
import { zodErrors } from "@/lib/validation";
import { money2 } from "@/lib/format";

export interface Item {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string;
  minimum_stock: number;
  last_purchase_price: number;
  cost_per_unit?: number;
}

function status(i: Item) {
  const q = Number(i.quantity), min = Number(i.minimum_stock);
  if (q <= 0) return { tone: "danger" as const, label: "Rupture", rank: 0 };
  if (min > 0 && q <= min) return { tone: "warning" as const, label: "Stock bas", rank: 1 };
  return { tone: "positive" as const, label: "OK", rank: 2 };
}

interface FormState { name: string; category: string; quantity: string; unit: string; minimum_stock: string; cost_per_unit: string }
const EMPTY: FormState = { name: "", category: "", quantity: "", unit: "pièces", minimum_stock: "", cost_per_unit: "" };
const s = (n: number | undefined) => (n ? String(n) : "");

export function InventoryManager({ items, canWrite }: { items: Item[]; canWrite: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const errs = zodErrors(inventoryItemSchema, form);

  function openCreate() { setEditing(null); setForm(EMPTY); setShowErrors(false); setOpen(true); }
  function openEdit(i: Item) {
    setEditing(i);
    setForm({ name: i.name, category: i.category ?? "", quantity: s(i.quantity), unit: i.unit, minimum_stock: s(i.minimum_stock), cost_per_unit: s(i.cost_per_unit) });
    setShowErrors(false);
    setOpen(true);
  }
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (Object.keys(errs).length) { setShowErrors(true); return; }
    setSaving(true);
    try {
      if (editing) {
        await fetchJson(`/api/inventory?id=${editing.id}`, { method: "PATCH", json: form });
        toast.success("Produit mis à jour");
      } else {
        await fetchJson("/api/inventory", { method: "POST", json: form });
        toast.success("Produit ajouté");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Échec de l’enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(i: Item) {
    if (!(await confirm({ title: "Supprimer le produit", message: `« ${i.name} » sera définitivement supprimé. Continuer ?`, confirmLabel: "Supprimer", danger: true }))) return;
    try {
      await fetchJson(`/api/inventory?id=${i.id}`, { method: "DELETE" });
      toast.success("Produit supprimé");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Échec de la suppression.");
    }
  }

  const cols: DataColumn<Item>[] = [
    { key: "name", header: "Produit", sortable: true, sortValue: (i) => i.name.toLowerCase(), render: (i) => <span className="font-medium">{i.name}</span> },
    { key: "category", header: "Catégorie", sortable: true, sortValue: (i) => i.category ?? "", render: (i) => i.category ?? "—" },
    { key: "quantity", header: "Quantité", numeric: true, sortable: true, sortValue: (i) => Number(i.quantity), render: (i) => `${Number(i.quantity)} ${i.unit}` },
    { key: "min", header: "Seuil", numeric: true, render: (i) => Number(i.minimum_stock) || "—" },
    { key: "price", header: "Dernier prix", numeric: true, sortable: true, sortValue: (i) => Number(i.last_purchase_price), render: (i) => money2(i.last_purchase_price) },
    { key: "status", header: "Statut", align: "center", sortable: true, sortValue: (i) => status(i).rank, render: (i) => { const st = status(i); return <Badge tone={st.tone}>{st.label}</Badge>; } },
    ...(canWrite ? [{
      key: "actions", header: "", align: "right" as const,
      render: (i: Item) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(i)} title="Modifier" className="h-8 w-8 inline-flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)]"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => remove(i)} title="Supprimer" className="h-8 w-8 inline-flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={openCreate}><Plus className="h-4 w-4" /> Ajouter un produit</Button>
        </div>
      )}
      <DataTable
        columns={cols}
        rows={items}
        rowKey={(i) => i.id}
        getSearchText={(i) => `${i.name} ${i.category ?? ""}`}
        searchPlaceholder="Rechercher un produit…"
        empty={
          <div className="flex flex-col items-center gap-2 py-6">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius)] bg-[var(--color-secondary)] text-[var(--color-muted-foreground)]"><Package className="h-5 w-5" /></span>
            <div className="font-medium text-[var(--color-foreground)]">Aucun produit pour l’instant</div>
            {canWrite && <Button size="sm" onClick={openCreate} className="mt-1"><Plus className="h-4 w-4" /> Ajouter un produit</Button>}
          </div>
        }
      />

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Modifier le produit" : "Ajouter un produit"}>
        <form onSubmit={save} className="p-5 space-y-4">
          <FormField label="Nom du produit" htmlFor="i-name" required error={showErrors ? errs.name : undefined}>
            <TextInput id="i-name" value={form.name} invalid={showErrors && !!errs.name} onChange={(e) => set("name", e.target.value)} placeholder="ex: Farine T55" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Catégorie" htmlFor="i-cat"><TextInput id="i-cat" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="ex: Sec" /></FormField>
            <FormField label="Unité" htmlFor="i-unit"><TextInput id="i-unit" value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="pièces, kg, L…" /></FormField>
            <FormField label="Quantité" htmlFor="i-qty" error={showErrors ? errs.quantity : undefined}><TextInput id="i-qty" inputMode="decimal" value={form.quantity} invalid={showErrors && !!errs.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder="0" /></FormField>
            <FormField label="Seuil (stock bas)" htmlFor="i-min" error={showErrors ? errs.minimum_stock : undefined}><TextInput id="i-min" inputMode="decimal" value={form.minimum_stock} invalid={showErrors && !!errs.minimum_stock} onChange={(e) => set("minimum_stock", e.target.value)} placeholder="0" /></FormField>
            <FormField label="Coût unitaire" htmlFor="i-cost" className="col-span-2" error={showErrors ? errs.cost_per_unit : undefined}><MoneyInput id="i-cost" value={form.cost_per_unit} invalid={showErrors && !!errs.cost_per_unit} onChange={(e) => set("cost_per_unit", e.target.value)} placeholder="0" /></FormField>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{editing ? "Enregistrer" : "Ajouter"}</Button>
          </div>
        </form>
      </Modal>
      {dialog}
    </div>
  );
}
