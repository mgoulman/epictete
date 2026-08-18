"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { SessionView } from "@/lib/session-view";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppShell({
  session,
  children,
}: {
  session: SessionView;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      {/* Desktop sidebar */}
      <div className="hidden lg:block shrink-0">
        <Sidebar role={session.role} perms={session.perms} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 shadow-[var(--shadow-soft)]">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute -right-11 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-card)] border border-[var(--color-border)]"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar
              role={session.role}
              perms={session.perms}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header session={session} onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto scroll-thin">
          <div className="mx-auto max-w-6xl px-4 lg:px-8 py-6 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
