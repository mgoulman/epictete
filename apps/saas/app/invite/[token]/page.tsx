import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { db } from "@/lib/db";
import { ROLE_LABEL_FR } from "@/lib/invite";
import { AcceptForm } from "./AcceptForm";

export const dynamic = "force-dynamic";

interface Row {
  tenant_name: string;
  email: string;
  role: string | null;
  status: string;
  expired: boolean;
  user_exists: boolean;
}

function ErrorCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-6">
      <div className="w-full max-w-sm text-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-8">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius)] bg-[var(--color-danger-bg)] text-[var(--color-danger)]">
          <AlertCircle className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-[var(--color-foreground)]">{title}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{body}</p>
        <Link href="/login" className="mt-5 inline-block text-sm font-medium text-[var(--color-accent)] hover:underline">
          Aller à la connexion
        </Link>
      </div>
    </div>
  );
}

export default async function InviteAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const { rows } = await db.unsafeQuery<Row>(
    `SELECT t.name AS tenant_name, i.email, r.name AS role, i.status,
            (i.expires_at < now()) AS expired,
            EXISTS (SELECT 1 FROM users u WHERE lower(u.email) = lower(i.email)) AS user_exists
       FROM invitations i
       JOIN tenants t ON t.id = i.tenant_id
       LEFT JOIN roles r ON r.id = i.role_id
      WHERE i.token = $1`,
    [token],
  );
  const invite = rows[0];

  if (!invite) return <ErrorCard title="Lien invalide" body="Ce lien d’invitation n’est pas valide." />;
  if (invite.status === "revoked")
    return <ErrorCard title="Invitation annulée" body="Cette invitation a été annulée par l’administrateur." />;
  if (invite.status === "accepted")
    return <ErrorCard title="Déjà utilisée" body="Cette invitation a déjà été utilisée. Connectez-vous." />;
  if (invite.expired)
    return <ErrorCard title="Lien expiré" body="Ce lien a expiré. Demandez une nouvelle invitation." />;

  return (
    <AcceptForm
      token={token}
      tenantName={invite.tenant_name}
      email={invite.email}
      roleLabel={ROLE_LABEL_FR[invite.role ?? ""] ?? invite.role ?? "Membre"}
      userExists={invite.user_exists}
    />
  );
}
