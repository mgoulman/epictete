"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { FormField, TextInput } from "@/components/ui/Field";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { fetchJson, ApiError } from "@/lib/api/fetch-json";
import { staffSchema } from "@/lib/schemas";
import { zodErrors } from "@/lib/validation";

export interface Staff { id: string; first_name: string; last_name: string; position: string | null; phone: string | null }
interface SForm { first_name: string; last_name: string; position: string; phone: string }
const empty = (): SForm => ({ first_name: "", last_name: "", position: "", phone: "" });

export function StaffManager({ staff, canWrite }: { staff: Staff[]; canWrite: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState<SForm>(empty());
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const errs = zodErrors(staffSchema, form);
  const set = (k: keyof SForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function openCreate() { setEditing(null); setForm(empty()); setShowErrors(false); setOpen(true); }
  function openEdit(m: Staff) { setEditing(m); setForm({ first_name: m.first_name, last_name: m.last_name, position: m.position ?? "", phone: m.phone ?? "" }); setShowErrors(false); setOpen(true); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (Object.keys(errs).length) { setShowErrors(true); return; }
    setSaving(true);
    try {
      if (editing) { await fetchJson(`/api/staff?id=${editing.id}`, { method: "PATCH", json: form }); toast.success("Employé mis à jour"); }
      else { await fetchJson("/api/staff", { method: "POST", json: form }); toast.success("Employé ajouté"); }
      setOpen(false); router.refresh();
    } catch (err) { toast.error(err instanceof ApiError ? err.message : "Échec."); }
    finally { setSaving(false); }
  }
  async function remove(m: Staff) {
    if (!(await confirm({ title: "Retirer l’employé", message: `« ${m.first_name} ${m.last_name} » sera désactivé. Continuer ?`, confirmLabel: "Retirer", danger: true }))) return;
    try { await fetchJson(`/api/staff?id=${m.id}`, { method: "DELETE" }); toast.success("Employé retiré"); router.refresh(); }
    catch (err) { toast.error(err instanceof ApiError ? err.message : "Échec."); }
  }

  const cols: DataColumn<Staff>[] = [
    { key: "name", header: "Nom", sortable: true, sortValue: (m) => `${m.first_name} ${m.last_name}`.toLowerCase(), render: (m) => <span className="font-medium">{m.first_name} {m.last_name}</span> },
    { key: "pos", header: "Poste", sortable: true, sortValue: (m) => m.position ?? "", render: (m) => m.position || "—" },
    { key: "phone", header: "Téléphone", render: (m) => m.phone || "—" },
    ...(canWrite ? [{
      key: "actions", header: "", align: "right" as const,
      render: (m: Staff) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(m)} className="h-8 w-8 inline-flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)]"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => remove(m)} className="h-8 w-8 inline-flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-4">
      {canWrite && <div className="flex justify-end"><Button onClick={openCreate}><Plus className="h-4 w-4" /> Ajouter un employé</Button></div>}
      <DataTable
        columns={cols} rows={staff} rowKey={(m) => m.id}
        getSearchText={(m) => `${m.first_name} ${m.last_name} ${m.position ?? ""}`}
        searchPlaceholder="Rechercher un employé…"
        empty={
          <div className="flex flex-col items-center gap-2 py-6">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius)] bg-[var(--color-secondary)] text-[var(--color-muted-foreground)]"><Users className="h-5 w-5" /></span>
            <div className="font-medium text-[var(--color-foreground)]">Aucun employé</div>
            {canWrite && <Button size="sm" onClick={openCreate} className="mt-1"><Plus className="h-4 w-4" /> Ajouter un employé</Button>}
          </div>
        }
      />
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Modifier l’employé" : "Ajouter un employé"}>
        <form onSubmit={save} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Prénom" htmlFor="s-fn" required error={showErrors ? errs.first_name : undefined}><TextInput id="s-fn" value={form.first_name} invalid={showErrors && !!errs.first_name} onChange={(e) => set("first_name", e.target.value)} /></FormField>
            <FormField label="Nom" htmlFor="s-ln" required error={showErrors ? errs.last_name : undefined}><TextInput id="s-ln" value={form.last_name} invalid={showErrors && !!errs.last_name} onChange={(e) => set("last_name", e.target.value)} /></FormField>
            <FormField label="Poste" htmlFor="s-pos"><TextInput id="s-pos" value={form.position} onChange={(e) => set("position", e.target.value)} placeholder="ex: Chef, Serveur…" /></FormField>
            <FormField label="Téléphone" htmlFor="s-phone"><TextInput id="s-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></FormField>
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
