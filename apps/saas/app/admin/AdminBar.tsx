"use client";

import { useRouter } from "next/navigation";
import { ShieldCheck, LogOut } from "lucide-react";

export function AdminBar({ name }: { name: string }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <header className="h-16 border-b border-[var(--color-border)] bg-[var(--color-card)]">
      <div className="mx-auto max-w-5xl h-full px-4 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-[var(--color-foreground)]">Console Epictète</div>
            <div className="text-[11px] text-[var(--color-muted-foreground)]">Administration plateforme</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--color-muted-foreground)] hidden sm:block">{name}</span>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[var(--radius-sm)] text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)]"
          >
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}
