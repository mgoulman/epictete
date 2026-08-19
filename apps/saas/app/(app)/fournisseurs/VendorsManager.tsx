"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Plus, Pencil, Trash2, Loader2, ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { FormField, TextInput, MoneyInput, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { fetchJson, ApiError } from "@/lib/api/fetch-json";
import { vendorSchema } from "@/lib/schemas";
import { zodErrors } from "@/lib/validation";
import { money2, todayISO } from "@/lib/format";

export interface Vendor {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  category: string | null;
  solde: number;
}

interface VForm { name: string; contact_name: string; phone: string; category: string }
const emptyV = (): VForm => ({ name: "", contact_name: "", phone: "", category: "" });

export function VendorsManager({ vendors, canWrite }: { vendors: Vendor[]; canWrite: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [vOpen, setVOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [vForm, setVForm] = useState<VForm>(emptyV());
  const [vErr, setVErr] = useState(false);
  const vErrs = zodErrors(vendorSchema, vForm);

  const [tOpen, setTOpen] = useState(false);
  const [txVendor, setTxVendor] = useState<Vendor | null>(null);
  const [tForm, setTForm] = useState({ type: "debt", amount: "", date: todayISO(), description: "" });
  const [busy, setBusy] = useState(false);

  const totalDue = vendors.reduce((s, v) => s + Math.max(0, Number(v.solde)), 0);

  function openCreate() { setEditing(null); setVForm(emptyV()); setVErr(false); setVOpen(true); }
  function openEdit(v: Vendor) { setEditing(v); setVForm({ name: v.name, contact_name: v.contact_name ?? "", phone: v.phone ?? "", category: v.category ?? "" }); setVErr(false); setVOpen(true); }
  function openTx(v: Vendor) { setTxVendor(v); setTForm({ type: "debt", amount: "", date: todayISO(), description: "" }); setTOpen(true); }

  async function saveVendor(e: React.FormEvent) {
    e.preventDefault();
    if (Object.keys(vErrs).length) { setVErr(true); return; }
    setBusy(true);
    try {
      if (editing) { await fetchJson(`/api/vendors?id=${editing.id}`, { method: "PATCH", json: vForm }); toast.success("Fournisseur mis à jour"); }
      else { await fetchJson("/api/vendors", { method: "POST", json: vForm }); toast.success("Fournisseur ajouté"); }
      setVOpen(false); router.refresh();
    } catch (err) { toast.error(err instanceof ApiError ? err.message : "Échec."); }
    finally { setBusy(false); }
  }
  async function saveTx(e: React.FormEvent) {
    e.preventDefault();
    if (!txVendor || Number(tForm.amount) <= 0) { toast.error("Montant requis."); return; }
    setBusy(true);
    try {
      await fetchJson("/api/vendor-transactions", { method: "POST", json: { ...tForm, vendor_id: txVendor.id } });
      toast.success(tForm.type === "debt" ? "Dette enregistrée" : "Paiement enregistré");
      setTOpen(false); router.refresh();
    } catch (err) { toast.error(err instanceof ApiError ? err.message : "Échec."); }
    finally { setBusy(false); }
  }
  async function remove(v: Vendor) {
    if (!(await confirm({ title: "Supprimer le fournisseur", message: `« ${v.name} » et son historique seront supprimés. Continuer ?`, confirmLabel: "Supprimer", danger: true }))) return;
    try { await fetchJson(`/api/vendors?id=${v.id}`, { method: "DELETE" }); toast.success("Fournisseur supprimé"); router.refresh(); }
    catch (err) { toast.error(err instanceof ApiError ? err.message : "Échec."); }
  }

  const cols: DataColumn<Vendor>[] = [
    { key: "name", header: "Fournisseur", sortable: true, sortValue: (v) => v.name.toLowerCase(), render: (v) => <span className="font-medium">{v.name}</span> },
    { key: "contact", header: "Contact", render: (v) => v.contact_name || "—" },
    { key: "phone", header: "Téléphone", render: (v) => v.phone || "—" },
    { key: "solde", header: "Solde dû", numeric: true, sortable: true, sortValue: (v) => Number(v.solde), render: (v) => Number(v.solde) > 0 ? <Badge tone="danger">{money2(v.solde)}</Badge> : <span className="text-[var(--color-positive)]">{money2(0)}</span> },
    ...(canWrite ? [{
      key: "actions", header: "", align: "right" as const,
      render: (v: Vendor) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openTx(v)} title="Enregistrer un mouvement" className="h-8 px-2 inline-flex items-center gap-1 rounded-[var(--radius-sm)] text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-secondary)]"><ArrowLeftRight className="h-3.5 w-3.5" /> Mouvement</button>
          <button onClick={() => openEdit(v)} className="h-8 w-8 inline-flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)]"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => remove(v)} className="h-8 w-8 inline-flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--color-muted-foreground)]">Total dû : <span className="font-semibold tnum text-[var(--color-danger)]">{money2(totalDue)}</span></div>
        {canWrite && <Button onClick={openCreate}><Plus className="h-4 w-4" /> Ajouter un fournisseur</Button>}
      </div>
      <DataTable
        columns={cols} rows={vendors} rowKey={(v) => v.id}
        getSearchText={(v) => `${v.name} ${v.contact_name ?? ""} ${v.category ?? ""}`}
        searchPlaceholder="Rechercher un fournisseur…"
        empty={
          <div className="flex flex-col items-center gap-2 py-6">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius)] bg-[var(--color-secondary)] text-[var(--color-muted-foreground)]"><Truck className="h-5 w-5" /></span>
            <div className="font-medium text-[var(--color-foreground)]">Aucun fournisseur</div>
            {canWrite && <Button size="sm" onClick={openCreate} className="mt-1"><Plus className="h-4 w-4" /> Ajouter un fournisseur</Button>}
          </div>
        }
      />

      <Modal open={vOpen} onClose={() => setVOpen(false)} title={editing ? "Modifier le fournisseur" : "Ajouter un fournisseur"}>
        <form onSubmit={saveVendor} className="p-5 space-y-4">
          <FormField label="Nom" htmlFor="v-name" required error={vErr ? vErrs.name : undefined}><TextInput id="v-name" value={vForm.name} invalid={vErr && !!vErrs.name} onChange={(e) => setVForm((f) => ({ ...f, name: e.target.value }))} placeholder="ex: Métro Maroc" /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Contact" htmlFor="v-contact"><TextInput id="v-contact" value={vForm.contact_name} onChange={(e) => setVForm((f) => ({ ...f, contact_name: e.target.value }))} /></FormField>
            <FormField label="Téléphone" htmlFor="v-phone"><TextInput id="v-phone" value={vForm.phone} onChange={(e) => setVForm((f) => ({ ...f, phone: e.target.value }))} /></FormField>
            <FormField label="Catégorie" htmlFor="v-cat" className="col-span-2"><TextInput id="v-cat" value={vForm.category} onChange={(e) => setVForm((f) => ({ ...f, category: e.target.value }))} placeholder="ex: Alimentaire" /></FormField>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setVOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{editing ? "Enregistrer" : "Ajouter"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={tOpen} onClose={() => setTOpen(false)} title={`Mouvement · ${txVendor?.name ?? ""}`}>
        <form onSubmit={saveTx} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type" htmlFor="t-type"><Select id="t-type" value={tForm.type} onChange={(e) => setTForm((f) => ({ ...f, type: e.target.value }))}><option value="debt">Facture / dette</option><option value="payment">Paiement</option></Select></FormField>
            <FormField label="Montant" htmlFor="t-amount" required><MoneyInput id="t-amount" value={tForm.amount} onChange={(e) => setTForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" /></FormField>
            <FormField label="Date" htmlFor="t-date"><TextInput id="t-date" type="date" value={tForm.date} onChange={(e) => setTForm((f) => ({ ...f, date: e.target.value }))} /></FormField>
            <FormField label="Note" htmlFor="t-desc"><TextInput id="t-desc" value={tForm.description} onChange={(e) => setTForm((f) => ({ ...f, description: e.target.value }))} placeholder="N° facture…" /></FormField>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setTOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Enregistrer</Button>
          </div>
        </form>
      </Modal>
      {dialog}
    </div>
  );
}
