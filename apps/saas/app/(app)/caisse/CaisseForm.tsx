"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Printer,
  Save,
  Loader2,
  Check,
  CalendarDays,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { fetchJson, ApiError } from "@/lib/api/fetch-json";
import { computeTotals, num, type CaisseData } from "@/lib/caisse";
import { money2, dateFR } from "@/lib/format";

// numeric fields held as strings so the inputs type freely
interface Src { name: string; amount: string; counts_as_cash: boolean }
interface Dep { label: string; amount: string }
interface State {
  entry_date: string;
  total_ca: string;
  total_cb: string;
  glovo_ttc_espece: string;
  glovo_ttc_online: string;
  payment_sources: Src[];
  depenses: Dep[];
  manager_name: string;
  especes_note: string;
}

const s = (n: number) => (n ? String(n) : "");

function fromData(d: CaisseData): State {
  return {
    entry_date: d.entry_date,
    total_ca: s(d.total_ca),
    total_cb: s(d.total_cb),
    glovo_ttc_espece: s(d.glovo_ttc_espece),
    glovo_ttc_online: s(d.glovo_ttc_online),
    payment_sources: d.payment_sources.map((p) => ({ name: p.name, amount: s(p.amount), counts_as_cash: p.counts_as_cash })),
    depenses: d.depenses.map((x) => ({ label: x.label, amount: s(x.amount) })),
    manager_name: d.manager_name,
    especes_note: d.especes_note,
  };
}

function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)] mb-1">
        {label}
      </span>
      <div className="relative">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-full h-11 pl-3 pr-10 rounded-[var(--radius-sm)] bg-[var(--color-background)] border border-[var(--color-border)] text-right tnum text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-accent)]"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-muted-foreground)]">
          DH
        </span>
      </div>
    </label>
  );
}

export function CaisseForm({
  initial,
  isExisting,
  branchName,
}: {
  initial: CaisseData;
  isExisting: boolean;
  branchName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [form, setForm] = useState<State>(() => fromData(initial));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(isExisting);
  const [dirty, setDirty] = useState(false);

  const set = <K extends keyof State>(k: K, v: State[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
    setDirty(true);
  };

  // Warn before leaving/reloading with unsaved edits.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const totals = useMemo(
    () =>
      computeTotals({
        total_ca: form.total_ca,
        total_cb: form.total_cb,
        glovo_ttc_espece: form.glovo_ttc_espece,
        glovo_ttc_online: form.glovo_ttc_online,
        payment_sources: form.payment_sources.map((p) => ({ ...p, amount: num(p.amount) })),
        depenses: form.depenses.map((d) => ({ ...d, amount: num(d.amount) })),
      }),
    [form],
  );

  async function changeDate(date: string) {
    if (!date || date === form.entry_date) return;
    if (
      dirty &&
      !(await confirm({
        title: "Modifications non enregistrées",
        message: "Changer de date effacera les modifications non enregistrées de cette feuille. Continuer ?",
        confirmLabel: "Changer de date",
        danger: true,
      }))
    ) {
      return;
    }
    router.push(`/caisse?date=${date}`);
  }

  async function save() {
    setSaving(true);
    try {
      await fetchJson("/api/caisse", {
        method: "POST",
        json: {
          entry_date: form.entry_date,
          total_ca: num(form.total_ca),
          total_cb: num(form.total_cb),
          glovo_ttc_espece: num(form.glovo_ttc_espece),
          glovo_ttc_online: num(form.glovo_ttc_online),
          payment_sources: form.payment_sources.map((p) => ({ name: p.name, amount: num(p.amount), counts_as_cash: p.counts_as_cash })),
          depenses: form.depenses.map((d) => ({ label: d.label, amount: num(d.amount) })),
          manager_name: form.manager_name,
          especes_note: form.especes_note,
        },
      });
      setSaved(true);
      setDirty(false);
      toast.success("Feuille de caisse enregistrée");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Échec de l’enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  function print() {
    const rows = (label: string, val: string) =>
      `<tr><td>${label}</td><td style="text-align:right">${val}</td></tr>`;
    const w = window.open("", "_blank", "width=420,height=640");
    if (!w) {
      toast.error("Autorisez les pop-ups pour imprimer la feuille.");
      return;
    }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Feuille de Caisse</title>
      <style>body{font-family:Inter,Arial,sans-serif;color:#1a1a18;padding:24px;font-size:13px}
      h1{font-size:16px;margin:0 0 2px}.muted{color:#6b6b5f;font-size:12px;margin-bottom:14px}
      table{width:100%;border-collapse:collapse;margin:10px 0}td{padding:4px 0;border-bottom:1px solid #eee}
      .sec{font-weight:600;text-transform:uppercase;font-size:11px;color:#606338;margin-top:14px}
      .tot td{font-weight:700;border:0}.tot{border-top:2px solid #606338}</style></head><body>
      <h1>Feuille de Caisse</h1><div class="muted">${branchName} · ${dateFR(form.entry_date)}${form.manager_name ? " · " + form.manager_name : ""}</div>
      <div class="sec">Recettes</div><table>
      ${rows("Total CA", money2(num(form.total_ca)))}${rows("Total CB", money2(num(form.total_cb)))}
      ${rows("Glovo TTC Espèce", money2(num(form.glovo_ttc_espece)))}${rows("Glovo TTC Online", money2(num(form.glovo_ttc_online)))}
      ${form.payment_sources.filter((p) => p.name || num(p.amount)).map((p) => rows(`${p.name || "—"}${p.counts_as_cash ? " (espèce)" : " (déduit)"}`, money2(num(p.amount)))).join("")}</table>
      <div class="sec">Dépenses</div><table>
      ${form.depenses.filter((d) => d.label || num(d.amount)).map((d) => rows(d.label || "—", money2(num(d.amount)))).join("") || rows("—", money2(0))}</table>
      <table class="tot">${rows("Total Dépense", money2(totals.totalDepense))}${rows("Total Espèce Caisse", money2(totals.caisseEspeces))}${rows("Total Espèces", money2(totals.totalEspeces))}${rows("Solde (reste espèces)", money2(totals.resteEspeces))}</table>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-accent)]/12 text-[var(--color-accent)]">
              <Wallet className="h-5 w-5" />
            </span>
            <h1 className="text-xl font-semibold text-[var(--color-foreground)]">Feuille de Caisse</h1>
            {saved ? (
              <Badge tone="positive">
                <Check className="h-3 w-3" /> Enregistrée
              </Badge>
            ) : (
              <Badge tone="warning">Brouillon</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)] capitalize">
            {branchName} · {dateFR(form.entry_date)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted-foreground)]" />
            <input
              type="date"
              value={form.entry_date}
              onChange={(e) => changeDate(e.target.value)}
              className="h-10 pl-8 pr-2 rounded-[var(--radius-sm)] bg-[var(--color-card)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            />
          </div>
          <Button variant="secondary" onClick={print}>
            <Printer className="h-4 w-4" /> Imprimer
          </Button>
          <Button onClick={save} disabled={saving || (!dirty && saved)}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saved && !dirty ? "Enregistré" : "Enregistrer"}
          </Button>
        </div>
      </div>
      {dialog}

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr_300px]">
        {/* ── Recettes ── */}
        <section className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-card)] p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-4">
            Recettes
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <MoneyField label="Total CA" value={form.total_ca} onChange={(v) => set("total_ca", v)} />
            <MoneyField label="Total CB" value={form.total_cb} onChange={(v) => set("total_cb", v)} />
            <MoneyField label="Glovo TTC Espèce" value={form.glovo_ttc_espece} onChange={(v) => set("glovo_ttc_espece", v)} />
            <MoneyField label="Glovo TTC Online" value={form.glovo_ttc_online} onChange={(v) => set("glovo_ttc_online", v)} />
          </div>

          {/* Autres encaissements */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Autres encaissements
              </span>
              <span className="text-[11px] text-[var(--color-muted-foreground)]">Virement, chèque…</span>
            </div>
            <div className="space-y-2">
              {form.payment_sources.map((src, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={src.name}
                    onChange={(e) => set("payment_sources", form.payment_sources.map((p, j) => (j === i ? { ...p, name: e.target.value } : p)))}
                    placeholder="Nom"
                    className="flex-1 h-9 px-2.5 rounded-[var(--radius-sm)] bg-[var(--color-background)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                  />
                  <input
                    inputMode="decimal"
                    value={src.amount}
                    onChange={(e) => set("payment_sources", form.payment_sources.map((p, j) => (j === i ? { ...p, amount: e.target.value } : p)))}
                    placeholder="0"
                    className="w-24 h-9 px-2.5 rounded-[var(--radius-sm)] bg-[var(--color-background)] border border-[var(--color-border)] text-sm text-right tnum focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                  />
                  <div className="flex rounded-[var(--radius-sm)] border border-[var(--color-border)] overflow-hidden text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => set("payment_sources", form.payment_sources.map((p, j) => (j === i ? { ...p, counts_as_cash: true } : p)))}
                      className={cn("px-2 py-1.5", src.counts_as_cash ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-muted-foreground)]")}
                    >
                      Espèce
                    </button>
                    <button
                      type="button"
                      onClick={() => set("payment_sources", form.payment_sources.map((p, j) => (j === i ? { ...p, counts_as_cash: false } : p)))}
                      className={cn("px-2 py-1.5", !src.counts_as_cash ? "bg-[var(--color-secondary)] text-[var(--color-foreground)]" : "text-[var(--color-muted-foreground)]")}
                    >
                      Déduit
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => set("payment_sources", form.payment_sources.filter((_, j) => j !== i))}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => set("payment_sources", [...form.payment_sources, { name: "", amount: "", counts_as_cash: true }])}
                className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent)] hover:underline"
              >
                <Plus className="h-4 w-4" /> Ajouter un encaissement
              </button>
            </div>
            {totals.especeSources > 0 && (
              <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex justify-between text-[11px] text-[var(--color-muted-foreground)]">
                <span>Ajouté aux espèces :</span>
                <span className="font-medium tnum">+{money2(totals.especeSources)}</span>
              </div>
            )}
          </div>
        </section>

        {/* ── Sorties / Dépenses ── */}
        <section className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-card)] p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-4">
            Dépenses
          </h2>
          <div className="space-y-2">
            {form.depenses.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={d.label}
                  onChange={(e) => set("depenses", form.depenses.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  placeholder="Libellé (ex: marché, fournisseur…)"
                  className="flex-1 h-9 px-2.5 rounded-[var(--radius-sm)] bg-[var(--color-background)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                />
                <input
                  inputMode="decimal"
                  value={d.amount}
                  onChange={(e) => set("depenses", form.depenses.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))}
                  placeholder="0"
                  className="w-24 h-9 px-2.5 rounded-[var(--radius-sm)] bg-[var(--color-background)] border border-[var(--color-border)] text-sm text-right tnum focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                />
                <button
                  type="button"
                  onClick={() => set("depenses", form.depenses.filter((_, j) => j !== i))}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {form.depenses.length === 0 && (
              <p className="text-sm text-[var(--color-muted-foreground)] py-2">Aucune dépense pour l’instant.</p>
            )}
            <button
              type="button"
              onClick={() => set("depenses", [...form.depenses, { label: "", amount: "" }])}
              className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent)] hover:underline"
            >
              <Plus className="h-4 w-4" /> Ajouter une dépense
            </button>
          </div>

          <div className="mt-5">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)] mb-1">
              Note espèces
            </span>
            <input
              value={form.especes_note}
              onChange={(e) => set("especes_note", e.target.value)}
              placeholder="ex: écart constaté, remise en banque…"
              className="w-full h-9 px-2.5 rounded-[var(--radius-sm)] bg-[var(--color-background)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            />
          </div>
        </section>

        {/* ── Totals rail (sticky) ── */}
        <aside className="lg:sticky lg:top-6 h-fit rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Totaux
          </h2>
          <TotalRow label="Total CA" value={money2(num(form.total_ca))} />
          <TotalRow label="Total Dépense" value={money2(totals.totalDepense)} tone="danger" />
          <div className="h-px bg-[var(--color-border)]" />
          <TotalRow label="Total Espèce Caisse" value={money2(totals.caisseEspeces)} strong />
          <TotalRow label="Total Espèces" value={money2(totals.totalEspeces)} strong />
          <div className="rounded-[var(--radius-sm)] px-3 py-2.5 mt-1"
            style={{ background: totals.resteEspeces >= 0 ? "var(--color-positive-bg)" : "var(--color-danger-bg)" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: totals.resteEspeces >= 0 ? "var(--color-positive)" : "var(--color-danger)" }}>
                Solde théorique
              </span>
              <span className="tnum text-lg font-bold" style={{ color: totals.resteEspeces >= 0 ? "var(--color-positive)" : "var(--color-danger)" }}>
                {money2(totals.resteEspeces)}
              </span>
            </div>
          </div>
          <Button onClick={save} disabled={saving || (!dirty && saved)} className="w-full mt-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer la feuille
          </Button>
        </aside>
      </div>
    </div>
  );
}

function TotalRow({ label, value, tone, strong }: { label: string; value: string; tone?: "danger"; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[var(--color-muted-foreground)]">{label}</span>
      <span
        className={cn(
          "tnum",
          strong ? "text-base font-semibold text-[var(--color-foreground)]" : "text-sm font-medium text-[var(--color-foreground)]",
          tone === "danger" && "text-[var(--color-danger)]",
        )}
      >
        {value}
      </span>
    </div>
  );
}
