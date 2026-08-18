"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, Store, Bell, ChevronDown, LogOut } from "lucide-react";
import type { SessionView } from "@/lib/session-view";
import { cn } from "@/components/ui/cn";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  manager: "Manager",
  cashier: "Caissier",
};

export function Header({ session, onMenu }: { session: SessionView; onMenu: () => void }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [lang, setLang] = useState<"FR" | "EN">("FR");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-background)]/90 backdrop-blur px-4 lg:px-6">
      <button
        onClick={onMenu}
        className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--color-secondary)]"
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Branch context pill (future home of the branch switcher) */}
      <div className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 h-9">
        <Store className="h-4 w-4 text-[var(--color-accent)]" />
        <span className="text-sm font-medium text-[var(--color-foreground)] truncate max-w-[180px]">
          {session.tenant.name}
        </span>
        {session.branch && (
          <>
            <span className="text-[var(--color-muted-foreground)]">·</span>
            <span className="text-sm text-[var(--color-muted-foreground)] truncate max-w-[120px]">
              {session.branch.name}
            </span>
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* Language toggle */}
      <button
        onClick={() => setLang((l) => (l === "FR" ? "EN" : "FR"))}
        className="h-9 px-2.5 rounded-[var(--radius-sm)] text-sm font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)]"
      >
        {lang}
      </button>

      {/* Notifications */}
      <button
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--color-secondary)]"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-[var(--color-muted-foreground)]" />
      </button>

      {/* Profile */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-[var(--radius)] hover:bg-[var(--color-secondary)]"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)] text-xs font-semibold">
            {initials(session.user.name)}
          </span>
          <span className="hidden sm:block text-sm font-medium text-[var(--color-foreground)] max-w-[120px] truncate">
            {session.user.name}
          </span>
          <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-60 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)] p-1.5">
            <div className="px-3 py-2">
              <div className="text-sm font-semibold text-[var(--color-foreground)] truncate">
                {session.user.name}
              </div>
              <div className="text-xs text-[var(--color-muted-foreground)] truncate">
                {session.user.email}
              </div>
              {session.role && (
                <div className="mt-1.5 inline-flex text-[11px] font-medium rounded px-1.5 py-0.5 bg-[var(--color-accent)]/12 text-[var(--color-accent)]">
                  {ROLE_LABEL[session.role] ?? session.role}
                </div>
              )}
            </div>
            <div className="my-1 h-px bg-[var(--color-border)]" />
            <button
              onClick={logout}
              className={cn(
                "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--color-danger)]",
                "hover:bg-[var(--color-danger-bg)]",
              )}
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
