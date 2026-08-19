"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ConsentGate() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    try {
      const res = await fetch("/api/consent", { method: "POST" });
      if (res.ok) router.refresh();
      else setBusy(false);
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-8">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius)] bg-[var(--color-accent)]/12 text-[var(--color-accent)]">
        <ShieldCheck className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-xl font-semibold text-[var(--color-foreground)]">Bienvenue sur Epictète</h1>
      <p className="mt-2 text-sm text-[var(--color-muted-foreground)] leading-relaxed">
        Avant de commencer, merci d’accepter les conditions du programme pilote. Elles encadrent
        l’utilisation de la plateforme pendant cette phase d’essai.
      </p>

      <label className="mt-5 flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]"
        />
        <span className="text-sm text-[var(--color-foreground)]">
          J’accepte les{" "}
          <a href="/legal/cgu" target="_blank" className="text-[var(--color-accent)] underline">conditions d’utilisation</a>{" "}
          et la{" "}
          <a href="/legal/confidentialite" target="_blank" className="text-[var(--color-accent)] underline">politique de confidentialité</a>{" "}
          (version pilote).
        </span>
      </label>

      <Button onClick={accept} disabled={!checked || busy} size="lg" className="mt-6 w-full">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuer"}
      </Button>
    </div>
  );
}
