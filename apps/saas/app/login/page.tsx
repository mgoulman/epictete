"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Connexion impossible.");
        setLoading(false);
        return;
      }
      router.push(data.redirect ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Erreur réseau. Réessayez.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[var(--color-background)]">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-[var(--color-accent)] text-[var(--color-accent-foreground)]">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-white/15 font-semibold">
            E
          </span>
          <span className="text-lg font-semibold">Epictète</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-tight text-white">
            Le pilotage de votre restaurant, au quotidien.
          </h1>
          <p className="mt-4 text-white/80 leading-relaxed">
            Caisse, stock, fournisseurs et équipe — une seule vue claire pour
            contrôler votre argent chaque jour.
          </p>
        </div>
        <div className="text-sm text-white/60">Programme pilote · Maroc</div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-semibold">
              E
            </span>
            <span className="text-lg font-semibold">Epictète</span>
          </div>

          <div className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius)] bg-[var(--color-accent)]/12 text-[var(--color-accent)] mb-4">
            <Wallet className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--color-foreground)]">Connexion</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Accédez à l’espace de gestion de votre restaurant.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@restaurant.ma"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="rounded-[var(--radius-sm)] bg-[var(--color-danger-bg)] text-[var(--color-danger)] text-sm px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Se connecter"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
