"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { reportError } from "@/lib/observability/report";

export function ErrorState({
  error,
  reset,
  where,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  where?: string;
}) {
  useEffect(() => {
    reportError(error, { where: where ?? "error-boundary", extra: { digest: error.digest } });
  }, [error, where]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center px-6">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius)] bg-[var(--color-danger-bg)] text-[var(--color-danger)]">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-[var(--color-foreground)]">Une erreur est survenue</h2>
      <p className="mt-1 max-w-sm text-sm text-[var(--color-muted-foreground)]">
        Quelque chose s’est mal passé de notre côté. Réessayez — si le problème persiste, contactez le support.
      </p>
      {reset && (
        <button
          onClick={reset}
          className="mt-5 inline-flex items-center gap-2 h-10 px-4 rounded-[var(--radius)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)] text-sm font-medium hover:bg-[var(--color-accent-hover)]"
        >
          <RotateCw className="h-4 w-4" /> Réessayer
        </button>
      )}
    </div>
  );
}
