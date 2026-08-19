"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Copy, Check, RefreshCw, Trash2, Loader2, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { fetchJson, ApiError } from "@/lib/api/fetch-json";
import { ROLE_LABEL_FR } from "@/lib/invite";

export interface Member {
  user_id: string;
  email: string;
  name: string;
  role: string | null;
  is_active: boolean;
}
export interface Invite {
  id: string;
  email: string;
  role: string | null;
  expires_at: string;
  expired: boolean;
}

function roleTone(role: string | null) {
  if (role === "owner") return "accent" as const;
  if (role === "manager") return "info" as const;
  return "neutral" as const;
}

export function TeamManager({
  initialMembers,
  initialInvites,
  canManage,
  currentUserId,
}: {
  initialMembers: Member[];
  initialInvites: Invite[];
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("cashier");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the link is still shown for manual copy */
    }
  }

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCreatedLink(null);
    try {
      const d = await fetchJson<{ url: string }>("/api/team", { method: "POST", json: { email, role } });
      setCreatedLink(d.url);
      setEmail("");
      toast.success("Invitation créée");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau.");
    } finally {
      setBusy(false);
    }
  }

  async function resend(id: string) {
    setPendingId(id);
    try {
      const d = await fetchJson<{ url: string }>(`/api/team?id=${id}`, { method: "PATCH" });
      setCreatedLink(d.url);
      await copy(d.url);
      toast.success("Nouveau lien généré et copié");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Échec du renvoi.");
    } finally {
      setPendingId(null);
    }
  }

  async function revoke(id: string) {
    if (!(await confirm({ title: "Révoquer l’invitation", message: "Le lien d’invitation ne fonctionnera plus. Continuer ?", confirmLabel: "Révoquer", danger: true }))) return;
    setPendingId(id);
    try {
      await fetchJson(`/api/team?id=${id}`, { method: "DELETE" });
      toast.success("Invitation révoquée");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Échec de la révocation.");
    } finally {
      setPendingId(null);
    }
  }

  async function memberAction(fn: () => Promise<unknown>, okMsg: string) {
    try {
      await fn();
      toast.success(okMsg);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action impossible.");
    }
  }
  const changeRole = (userId: string, role: string) =>
    memberAction(() => fetchJson(`/api/members?userId=${userId}`, { method: "PATCH", json: { role } }), "Rôle mis à jour");
  const toggleActive = (userId: string, is_active: boolean) =>
    memberAction(() => fetchJson(`/api/members?userId=${userId}`, { method: "PATCH", json: { is_active } }), is_active ? "Accès réactivé" : "Accès désactivé");
  async function removeMember(userId: string, name: string) {
    if (!(await confirm({ title: "Retirer le membre", message: `« ${name} » perdra l’accès à cet espace. Continuer ?`, confirmLabel: "Retirer", danger: true }))) return;
    memberAction(() => fetchJson(`/api/members?userId=${userId}`, { method: "DELETE" }), "Membre retiré");
  }

  const memberCols: DataColumn<Member>[] = [
    {
      key: "name",
      header: "Nom",
      render: (m) => (
        <span className="font-medium">
          {m.name}
          {m.user_id === currentUserId && (
            <span className="ml-2 text-[10px] font-semibold rounded px-1.5 py-0.5 bg-[var(--color-secondary)] text-[var(--color-muted-foreground)]">
              Vous
            </span>
          )}
        </span>
      ),
    },
    { key: "email", header: "Email", render: (m) => <span className="text-[var(--color-muted-foreground)]">{m.email}</span> },
    {
      key: "role",
      header: "Rôle",
      render: (m) => {
        const editable = canManage && m.role !== "owner" && m.user_id !== currentUserId;
        if (!editable) return <Badge tone={roleTone(m.role)}>{ROLE_LABEL_FR[m.role ?? ""] ?? m.role}</Badge>;
        return (
          <select
            value={m.role ?? "cashier"}
            onChange={(e) => changeRole(m.user_id, e.target.value)}
            className="h-8 px-2 rounded-[var(--radius-sm)] bg-[var(--color-background)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
          >
            <option value="manager">Manager</option>
            <option value="cashier">Caissier</option>
          </select>
        );
      },
    },
    {
      key: "status",
      header: "Statut",
      align: "center",
      render: (m) => (m.is_active ? <Badge tone="positive">Actif</Badge> : <Badge tone="neutral">Désactivé</Badge>),
    },
    ...(canManage
      ? [{
          key: "m-actions", header: "", align: "right" as const,
          render: (m: Member) => {
            if (m.role === "owner" || m.user_id === currentUserId) return null;
            return (
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => toggleActive(m.user_id, !m.is_active)} className="text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
                  {m.is_active ? "Désactiver" : "Réactiver"}
                </button>
                <button onClick={() => removeMember(m.user_id, m.name)} title="Retirer" className="h-8 w-8 inline-flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          },
        }]
      : []),
  ];

  const inviteCols: DataColumn<Invite>[] = [
    { key: "email", header: "Email", render: (i) => <span className="font-medium">{i.email}</span> },
    { key: "role", header: "Rôle", render: (i) => <Badge tone={roleTone(i.role)}>{ROLE_LABEL_FR[i.role ?? ""] ?? i.role}</Badge> },
    {
      key: "status",
      header: "Statut",
      render: (i) => (i.expired ? <Badge tone="neutral">Expirée</Badge> : <Badge tone="warning">En attente</Badge>),
    },
    {
      key: "expires",
      header: "Expire le",
      render: (i) => new Date(i.expires_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            align: "right" as const,
            render: (i: Invite) => (
              <div className="flex items-center justify-end gap-1">
                <button onClick={() => resend(i.id)} title="Renvoyer (nouveau lien)" className="h-8 w-8 inline-flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)]">
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button onClick={() => revoke(i.id)} title="Révoquer" className="h-8 w-8 inline-flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Invite action */}
      {canManage && (
        <div className="flex justify-end">
          {!showInvite ? (
            <Button onClick={() => { setShowInvite(true); setCreatedLink(null); setError(null); }}>
              <UserPlus className="h-4 w-4" /> Inviter un membre
            </Button>
          ) : null}
        </div>
      )}

      {canManage && showInvite && (
        <Card>
          <CardHeader>
            <CardTitle>Inviter un membre</CardTitle>
            <button onClick={() => setShowInvite(false)} className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardBody>
            {createdLink ? (
              <div className="space-y-3">
                <p className="text-sm text-[var(--color-foreground)]">
                  Invitation créée. Envoyez ce lien à la personne (par WhatsApp, SMS…) :
                </p>
                <div className="flex items-center gap-2">
                  <input readOnly value={createdLink} className="flex-1 h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-muted-foreground)]" />
                  <Button variant="secondary" onClick={() => copy(createdLink)}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copié" : "Copier"}
                  </Button>
                </div>
                <button onClick={() => setCreatedLink(null)} className="text-sm font-medium text-[var(--color-accent)] hover:underline">
                  Inviter quelqu’un d’autre
                </button>
              </div>
            ) : (
              <form onSubmit={createInvite} className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[220px]">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="membre@restaurant.ma" required />
                </div>
                <div className="w-40">
                  <Label htmlFor="invite-role">Rôle</Label>
                  <select
                    id="invite-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-background)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                  >
                    <option value="cashier">Caissier</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer l’invitation"}
                </Button>
              </form>
            )}
            {error && <div className="mt-3 text-sm text-[var(--color-danger)]">{error}</div>}
          </CardBody>
        </Card>
      )}

      {/* Members */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-2">Membres ({initialMembers.length})</h2>
        <DataTable columns={memberCols} rows={initialMembers} rowKey={(m) => m.user_id} getSearchText={(m) => `${m.name} ${m.email} ${m.role ?? ""}`} searchPlaceholder="Rechercher un membre…" />
      </div>

      {/* Pending invites */}
      {initialInvites.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-2">Invitations en attente ({initialInvites.length})</h2>
          <DataTable columns={inviteCols} rows={initialInvites} rowKey={(i) => i.id} pageSize={20} />
        </div>
      )}

      {!canManage && (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Seul le propriétaire peut inviter ou gérer les membres.
        </p>
      )}
      {dialog}
    </div>
  );
}
