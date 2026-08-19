"use client";

import { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";

type Size = "sm" | "md" | "lg";
const SIZES: Record<Size, string> = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

/**
 * Base modal: overlay + centered panel, escape, click-outside, body-scroll-lock,
 * focus-on-open + focus-return, role=dialog/aria-modal. All app modals build on this.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  closeOnBackdrop = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: Size;
  closeOnBackdrop?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    // focus the panel on open
    const id = requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      cancelAnimationFrame(id);
      prevFocus.current?.focus?.();
    };
  }, [open, onKey]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 overlay-in"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "dialog-in w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)] outline-none",
          SIZES[size],
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-base font-semibold text-[var(--color-foreground)]">{title}</h2>
            <button onClick={onClose} aria-label="Fermer" className="p-1 rounded-[var(--radius-sm)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)]">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
