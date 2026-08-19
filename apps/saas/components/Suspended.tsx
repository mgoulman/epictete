"use client";

import { useRouter } from "next/navigation";
import { PauseCircle, LogOut } from "lucide-react";

export function Suspended({ tenantName, status }: { tenantName: string; status: string }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  const offboarding = status === "offboarding";
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-6">
      <div className="w-full max-w-md text-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-8">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]">
          <PauseCircle className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-[var(--color-foreground)]">
          {offboarding ? "Compte en cours de clôture" : "Accès suspendu"}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          L’accès à l’espace de <span className="font-medium">{tenantName}</span> est
          {offboarding ? " en cours de clôture" : " temporairement suspendu"}. Contactez l’équipe
          Epictète pour rétablir votre accès.
        </p>
        <button
          onClick={logout}
          className="mt-6 inline-flex items-center gap-2 h-10 px-4 rounded-[var(--radius)] bg-[var(--color-secondary)] text-[var(--color-foreground)] text-sm font-medium hover:bg-[var(--color-muted)]"
        >
          <LogOut className="h-4 w-4" /> Se déconnecter
        </button>
      </div>
    </div>
  );
}
