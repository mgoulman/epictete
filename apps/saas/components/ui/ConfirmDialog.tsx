"use client";

import { useCallback, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

/**
 * Ergonomic confirmation. `await confirm({...})` resolves to a boolean; render
 * `dialog` once in the component. Pair with toast.promise for pending feedback:
 *
 *   const { confirm, dialog } = useConfirm();
 *   if (await confirm({ title, message, danger: true })) { ...toast.promise(del())... }
 *   return <>{...}{dialog}</>;
 */
export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  };

  const dialog = opts ? (
    <Modal open onClose={() => settle(false)} size="sm">
      <div className="p-5">
        <div className="flex items-start gap-3">
          {opts.danger && (
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--color-danger-bg)] text-[var(--color-danger)]">
              <AlertTriangle className="h-5 w-5" />
            </span>
          )}
          <div>
            <h3 className="text-base font-semibold text-[var(--color-foreground)]">{opts.title}</h3>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{opts.message}</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => settle(false)}>
            {opts.cancelLabel ?? "Annuler"}
          </Button>
          <Button variant={opts.danger ? "danger" : "primary"} onClick={() => settle(true)}>
            {opts.confirmLabel ?? "Confirmer"}
          </Button>
        </div>
      </div>
    </Modal>
  ) : null;

  return { confirm, dialog };
}
