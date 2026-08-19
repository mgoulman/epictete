"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function AcceptForm({
  token,
  tenantName,
  email,
  roleLabel,
  userExists,
}: {
  token: string;
  tenantName: string;
  email: string;
  roleLabel: string;
  userExists: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Inline validation (new users only): min length + confirmation match.
  const pwTooShort = !userExists && password.length > 0 && password.length < 8;
  const mismatch = !userExists && confirm.length > 0 && confirm !== password;
  const canSubmit =
    userExists
      ? password.length > 0
      : name.trim().length > 0 && password.length >= 8 && confirm === password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? "Impossible de rejoindre l’équipe.");
        setLoading(false);
        return;
      }
      router.push(d.redirect ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Erreur réseau.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[var(--color-background)]">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-[var(--color-accent)] text-[var(--color-accent-foreground)]">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-white/15 font-semibold">E</span>
          <span className="text-lg font-semibold">Epictète</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-tight text-white">
            Rejoignez l’équipe de {tenantName}.
          </h1>
          <p className="mt-4 text-white/80 leading-relaxed">
            Vous aurez accès à l’espace de gestion pour piloter la caisse, le stock et l’équipe au quotidien.
          </p>
        </div>
        <div className="text-sm text-white/60">Programme pilote · Maroc</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius)] bg-[var(--color-accent)]/12 text-[var(--color-accent)] mb-4">
            <UserPlus className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
            {tenantName} vous invite
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            En tant que <span className="font-medium text-[var(--color-foreground)]">{roleLabel}</span> · {email}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {!userExists && (
              <div>
                <Label htmlFor="name">Nom complet</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Prénom Nom" required />
              </div>
            )}
            <div>
              <Label htmlFor="password">
                {userExists ? "Votre mot de passe" : "Choisissez un mot de passe"}
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete={userExists ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              {!userExists && (
                <p className={"mt-1 text-xs " + (pwTooShort ? "text-[var(--color-danger)]" : "text-[var(--color-muted-foreground)]")}>
                  8 caractères minimum.
                </p>
              )}
            </div>

            {!userExists && (
              <div>
                <Label htmlFor="confirm">Confirmez le mot de passe</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                {mismatch && (
                  <p className="mt-1 text-xs text-[var(--color-danger)]">Les mots de passe ne correspondent pas.</p>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-[var(--radius-sm)] bg-[var(--color-danger-bg)] text-[var(--color-danger)] text-sm px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" disabled={loading || !canSubmit} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : userExists ? "Se connecter et rejoindre" : "Créer mon compte et rejoindre"}
            </Button>
            <p className="text-xs text-[var(--color-muted-foreground)] text-center">
              En rejoignant, vous acceptez les{" "}
              <a href="/legal/cgu" className="underline">conditions d’utilisation</a> (version pilote).
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
