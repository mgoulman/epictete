import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { db } from "@/lib/db";
import { ResetForm } from "./ResetForm";

export const dynamic = "force-dynamic";

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

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { rows } = await db.unsafeQuery<{ email: string; expired: boolean; used: boolean }>(
    `SELECT u.email, (pr.expires_at < now()) AS expired, (pr.used_at IS NOT NULL) AS used
       FROM password_resets pr JOIN users u ON u.id = pr.user_id WHERE pr.token = $1`,
    [token],
  );
  const r = rows[0];
  if (!r) return <ErrorCard title="Lien invalide" body="Ce lien de réinitialisation n’est pas valide." />;
  if (r.used) return <ErrorCard title="Lien déjà utilisé" body="Ce lien a déjà servi. Demandez-en un nouveau." />;
  if (r.expired) return <ErrorCard title="Lien expiré" body="Ce lien a expiré. Demandez-en un nouveau." />;

  return <ResetForm token={token} email={r.email} />;
}
