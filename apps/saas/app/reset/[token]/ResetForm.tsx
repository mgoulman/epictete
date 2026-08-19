"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function ResetForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = password.length >= 8 && confirm === password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/reset/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error ?? "Impossible de réinitialiser."); setLoading(false); return; }
      router.push(d.redirect ?? "/login");
      router.refresh();
    } catch {
      setError("Erreur réseau.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-6">
      <div className="w-full max-w-sm">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius)] bg-[var(--color-accent)]/12 text-[var(--color-accent)] mb-4">
          <KeyRound className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-semibold text-[var(--color-foreground)]">Nouveau mot de passe</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Pour le compte {email}.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="pw">Nouveau mot de passe</Label>
            <Input id="pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            <p className={"mt-1 text-xs " + (tooShort ? "text-[var(--color-danger)]" : "text-[var(--color-muted-foreground)]")}>8 caractères minimum.</p>
          </div>
          <div>
            <Label htmlFor="cf">Confirmez</Label>
            <Input id="cf" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required />
            {mismatch && <p className="mt-1 text-xs text-[var(--color-danger)]">Les mots de passe ne correspondent pas.</p>}
          </div>
          {error && <div className="rounded-[var(--radius-sm)] bg-[var(--color-danger-bg)] text-[var(--color-danger)] text-sm px-3 py-2">{error}</div>}
          <Button type="submit" size="lg" disabled={loading || !canSubmit} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Réinitialiser le mot de passe"}
          </Button>
        </form>
      </div>
    </div>
  );
}
