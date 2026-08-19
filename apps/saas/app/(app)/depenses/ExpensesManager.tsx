"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { FormField, TextInput, MoneyInput, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { fetchJson, ApiError } from "@/lib/api/fetch-json";
import { expenseSchema, EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/schemas";
import { zodErrors } from "@/lib/validation";
import { money2, dateFR, todayISO } from "@/lib/format";
import { EXPENSE_CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/labels";

export interface Expense {
  id: string;
  expense_date: string;
  amount: number;
  payment_method: string;
  category: string;
  description: string | null;
}

interface FormState { expense_date: string; amount: string; payment_method: string; category: string; description: string }
const empty = (): FormState => ({ expense_date: todayISO(), amount: "", payment_method: "cash", category: "other", description: "" });

export function ExpensesManager({ items, canWrite }: { items: Expense[]; canWrite: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<FormState>(empty());
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const errs = zodErrors(expenseSchema, form);

  const total = items.reduce((s, e) => s + Number(e.amount), 0);

  function openCreate() { setEditing(null); setForm(empty()); setShowErrors(false); setOpen(true); }
  function openEdit(e: Expense) {
    setEditing(e);
    setForm({ expense_date: e.expense_date.slice(0, 10), amount: String(e.amount), payment_method: e.payment_method, category: e.category, description: e.description ?? "" });
    setShowErrors(false); setOpen(true);
  }
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    if (Object.keys(errs).length) { setShowErrors(true); return; }
    setSaving(true);
    try {
      if (editing) { await fetchJson(`/api/expenses?id=${editing.id}`, { method: "PATCH", json: form }); toast.success("Dépense mise à jour"); }
      else { await fetchJson("/api/expenses", { method: "POST", json: form }); toast.success("Dépense ajoutée"); }
      setOpen(false); router.refresh();
    } catch (err) { toast.error(err instanceof ApiError ? err.message : "Échec de l’enregistrement."); }
    finally { setSaving(false); }
  }
  async function remove(e: Expense) {
    if (!(await confirm({ title: "Supprimer la dépense", message: `Cette dépense de ${money2(e.amount)} sera supprimée. Continuer ?`, confirmLabel: "Supprimer", danger: true }))) return;
    try { await fetchJson(`/api/expenses?id=${e.id}`, { method: "DELETE" }); toast.success("Dépense supprimée"); router.refresh(); }
    catch (err) { toast.error(err instanceof ApiError ? err.message : "Échec de la suppression."); }
  }

  const cols: DataColumn<Expense>[] = [
    { key: "date", header: "Date", sortable: true, sortValue: (e) => e.expense_date, render: (e) => dateFR(e.expense_date.slice(0, 10)) },
    { key: "cat", header: "Catégorie", sortable: true, sortValue: (e) => e.category, render: (e) => EXPENSE_CATEGORY_LABELS[e.category] ?? e.category },
    { key: "desc", header: "Description", render: (e) => e.description || "—" },
    { key: "method", header: "Mode", render: (e) => <Badge tone="neutral">{PAYMENT_METHOD_LABELS[e.payment_method] ?? e.payment_method}</Badge> },
    { key: "amount", header: "Montant", numeric: true, sortable: true, sortValue: (e) => Number(e.amount), render: (e) => money2(e.amount) },
    ...(canWrite ? [{
      key: "actions", header: "", align: "right" as const,
      render: (e: Expense) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(e)} className="h-8 w-8 inline-flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)]"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => remove(e)} className="h-8 w-8 inline-flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--color-muted-foreground)]">Total : <span className="font-semibold text-[var(--color-foreground)] tnum">{money2(total)}</span></div>
        {canWrite && <Button onClick={openCreate}><Plus className="h-4 w-4" /> Ajouter une dépense</Button>}
      </div>
      <DataTable
        columns={cols}
        rows={items}
        rowKey={(e) => e.id}
        getSearchText={(e) => `${e.description ?? ""} ${EXPENSE_CATEGORY_LABELS[e.category] ?? ""}`}
        searchPlaceholder="Rechercher une dépense…"
        empty={
          <div className="flex flex-col items-center gap-2 py-6">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius)] bg-[var(--color-secondary)] text-[var(--color-muted-foreground)]"><Receipt className="h-5 w-5" /></span>
            <div className="font-medium text-[var(--color-foreground)]">Aucune dépense enregistrée</div>
            {canWrite && <Button size="sm" onClick={openCreate} className="mt-1"><Plus className="h-4 w-4" /> Ajouter une dépense</Button>}
          </div>
        }
      />

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Modifier la dépense" : "Ajouter une dépense"}>
        <form onSubmit={save} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" htmlFor="e-date"><TextInput id="e-date" type="date" value={form.expense_date} onChange={(ev) => set("expense_date", ev.target.value)} /></FormField>
            <FormField label="Montant" htmlFor="e-amount" required error={showErrors ? errs.amount : undefined}><MoneyInput id="e-amount" value={form.amount} invalid={showErrors && !!errs.amount} onChange={(ev) => set("amount", ev.target.value)} placeholder="0" /></FormField>
            <FormField label="Catégorie" htmlFor="e-cat"><Select id="e-cat" value={form.category} onChange={(ev) => set("category", ev.target.value)}>{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>)}</Select></FormField>
            <FormField label="Mode de paiement" htmlFor="e-method"><Select id="e-method" value={form.payment_method} onChange={(ev) => set("payment_method", ev.target.value)}>{PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}</Select></FormField>
          </div>
          <FormField label="Description" htmlFor="e-desc"><Textarea id="e-desc" value={form.description} onChange={(ev) => set("description", ev.target.value)} placeholder="Détail (optionnel)" /></FormField>
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
