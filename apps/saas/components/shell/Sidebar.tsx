"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, canSee } from "@/lib/nav";
import { cn } from "@/components/ui/cn";

interface SidebarProps {
  role: string | null;
  perms: string[];
  onNavigate?: () => void;
}

export function Sidebar({ role, perms, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col bg-[var(--color-card)] border-r border-[var(--color-border)]">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-[var(--color-border)] shrink-0">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-semibold">
          E
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-[var(--color-foreground)]">Epictète</div>
          <div className="text-[11px] text-[var(--color-muted-foreground)]">Gestion restaurant</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scroll-thin px-3 py-4 space-y-6">
        {NAV.map((section) => {
          const items = section.items.filter((i) => canSee(i, role, perms));
          if (items.length === 0) return null;
          return (
            <div key={section.title}>
              <div className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                {section.title}
              </div>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "group flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                            : "text-[var(--color-secondary-foreground)] hover:bg-[var(--color-secondary)]",
                        )}
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.soon && (
                          <span
                            className={cn(
                              "text-[10px] rounded px-1.5 py-0.5 font-semibold",
                              active
                                ? "bg-white/20 text-white"
                                : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]",
                            )}
                          >
                            bientôt
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="px-5 py-3 border-t border-[var(--color-border)] text-[11px] text-[var(--color-muted-foreground)] shrink-0">
        Pilote · v0.1
      </div>
    </aside>
  );
}
