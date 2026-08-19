"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Store, CheckCircle2, Plus, Copy, Check, Pause, Play, X, Loader2, Eye, Download, Trash2 } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { fetchJson, ApiError } from "@/lib/api/fetch-json";

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  status: string;
  created_at: string;
  members: number;
  cash_sheets: number;
  has_owner: boolean;
}

const STATUS: Record<string, { tone: "positive" | "danger" | "warning" | "neutral"; label: string }> = {
  active: { tone: "positive", label: "Actif" },
  suspended: { tone: "danger", label: "Suspendu" },
  offboarding: { tone: "warning", label: "Départ" },
};

export function AdminConsole({ initialTenants }: { initialTenants: TenantRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const total = initialTenants.length;
  const active = initialTenants.filter((t) => t.status === "active").length;
  const onboarded = initialTenants.filter((t) => t.cash_sheets > 0).length;

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* shown for manual copy */
    }
  }

  async function provision(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setLink(null);
    try {
      const d = await fetchJson<{ url: string }>("/api/admin/provision", {
        method: "POST",
        json: { restaurantName: name, city, ownerEmail },
      });
      setLink(d.url);
      setName("");
      setCity("");
      setOwnerEmail("");
      toast.success("Restaurant provisionné");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: string, tenantName: string) {
    if (status === "suspended") {
      const ok = await confirm({
        title: "Suspendre ce restaurant",
        message: `L’accès de « ${tenantName} » sera bloqué immédiatement (lecture et écriture). Continuer ?`,
        confirmLabel: "Suspendre",
        danger: true,
      });
      if (!ok) return;
    }
    try {
      await fetchJson(`/api/admin/tenants?id=${id}&status=${status}`, { method: "PATCH" });
      toast.success(status === "suspended" ? "Restaurant suspendu" : "Restaurant réactivé");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Échec de la mise à jour.");
    }
    return;
  }

  async function deleteTenant(t: TenantRow) {
    const ok = await confirm({
      title: "Supprimer définitivement",
      message: `Toutes les données de « ${t.name} » (feuilles, stock, équipe…) seront supprimées de façon irréversible. Exportez d’abord les données si nécessaire. Continuer ?`,
      confirmLabel: "Supprimer définitivement",
      danger: true,
    });
    if (!ok) return;
    try {
      await fetchJson(`/api/admin/tenants?id=${t.id}`, { method: "DELETE" });
      toast.success("Restaurant supprimé");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Échec de la suppression.");
    }
  }

  async function impersonate(t: TenantRow) {
    try {
      const d = await fetchJson<{ redirect: string }>(`/api/admin/impersonate?tenantId=${t.id}`, { method: "POST" });
      router.push(d.redirect ?? "/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Impossible d’ouvrir la session support.");
    }
  }

  const cols: DataColumn<TenantRow>[] = [
    {
      key: "name",
      header: "Restaurant",
      sortable: true,
      sortValue: (t) => t.name.toLowerCase(),
      render: (t) => (
        <div>
          <div className="font-medium">{t.name}</div>
          <div className="text-xs text-[var(--color-muted-foreground)]">{t.slug}{t.city ? ` · ${t.city}` : ""}</div>
        </div>
      ),
    },
    { key: "status", header: "Statut", sortable: true, sortValue: (t) => t.status, render: (t) => <Badge tone={STATUS[t.status]?.tone ?? "neutral"}>{STATUS[t.status]?.label ?? t.status}</Badge> },
    {
      key: "owner",
      header: "Propriétaire",
      render: (t) => (t.has_owner ? <Badge tone="positive">Actif</Badge> : <Badge tone="warning">Invitation en attente</Badge>),
    },
    { key: "members", header: "Membres", numeric: true, sortable: true, sortValue: (t) => t.members, render: (t) => t.members },
    { key: "cash", header: "Feuilles", numeric: true, sortable: true, sortValue: (t) => t.cash_sheets, render: (t) => t.cash_sheets },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (t) => (
        <div className="flex items-center justify-end gap-3">
          {t.has_owner && t.status === "active" && (
            <button onClick={() => impersonate(t)} title="Voir en tant que (support)" className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-accent)]">
              <Eye className="h-4 w-4" /> Voir
            </button>
          )}
          {t.status === "active" ? (
            <button onClick={() => setStatus(t.id, "suspended", t.name)} className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)]">
              <Pause className="h-4 w-4" /> Suspendre
            </button>
          ) : (
            <button onClick={() => setStatus(t.id, "active", t.name)} className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-positive)]">
              <Play className="h-4 w-4" /> Réactiver
            </button>
          )}
          <a href={`/api/admin/tenants/export?tenantId=${t.id}`} title="Exporter les données (JSON)" className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)]">
            <Download className="h-4 w-4" />
          </a>
          {t.status !== "active" && (
            <button onClick={() => deleteTenant(t)} title="Supprimer définitivement" className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-foreground)]">Restaurants</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Cohorte pilote — provisionnement et gestion.</p>
        </div>
        {!open && (
          <Button onClick={() => { setOpen(true); setLink(null); setError(null); }}>
            <Plus className="h-4 w-4" /> Provisionner un restaurant
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Restaurants" value={total} icon={<Building2 className="h-5 w-5" />} tone="accent" />
        <StatCard label="Actifs" value={active} icon={<Store className="h-5 w-5" />} tone="positive" />
        <StatCard label="Onboardés" value={onboarded} icon={<CheckCircle2 className="h-5 w-5" />} tone="info" hint="≥ 1 feuille de caisse" />
      </div>

      {open && (
        <Card>
          <CardHeader>
            <CardTitle>Provisionner un restaurant</CardTitle>
            <button onClick={() => setOpen(false)} className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardBody>
            {link ? (
              <div className="space-y-3">
                <p className="text-sm text-[var(--color-foreground)]">
                  Restaurant créé. Envoyez ce lien au propriétaire — il définit son mot de passe et prend possession de l’espace :
                </p>
                <div className="flex items-center gap-2">
                  <input readOnly value={link} className="flex-1 h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-muted-foreground)]" />
                  <Button variant="secondary" onClick={() => copy(link)}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copié" : "Copier"}
                  </Button>
                </div>
                <button onClick={() => setLink(null)} className="text-sm font-medium text-[var(--color-accent)] hover:underline">
                  Provisionner un autre restaurant
                </button>
              </div>
            ) : (
              <form onSubmit={provision} className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="rname">Nom du restaurant</Label>
                  <Input id="rname" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Le Gourmet" required />
                </div>
                <div>
                  <Label htmlFor="rcity">Ville</Label>
                  <Input id="rcity" value={city} onChange={(e) => setCity(e.target.value)} placeholder="ex: Marrakech" />
                </div>
                <div>
                  <Label htmlFor="oemail">Email du propriétaire</Label>
                  <Input id="oemail" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="proprietaire@restaurant.ma" required />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer + générer le lien propriétaire"}
                  </Button>
                </div>
              </form>
            )}
            {error && <div className="mt-3 text-sm text-[var(--color-danger)]">{error}</div>}
          </CardBody>
        </Card>
      )}

      {initialTenants.length > 0 ? (
        <DataTable
          columns={cols}
          rows={initialTenants}
          rowKey={(t) => t.id}
          getSearchText={(t) => `${t.name} ${t.slug} ${t.city ?? ""}`}
          searchPlaceholder="Rechercher un restaurant…"
        />
      ) : (
        <div className="rounded-[var(--radius)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-card)] py-12 text-center text-sm text-[var(--color-muted-foreground)]">
          Aucun restaurant. Provisionnez le premier pour lancer la cohorte pilote.
        </div>
      )}
      {dialog}
    </div>
  );
}
