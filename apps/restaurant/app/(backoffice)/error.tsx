'use client';

// Backoffice route error boundary. Catches render/data errors within any admin
// page and shows a themed recovery screen instead of a white screen. The
// backoffice shell/layout stays mounted around it.

import { useEffect } from 'react';
import { AlertTriangle, RotateCw, Home } from 'lucide-react';
import Link from 'next/link';
import { reportError } from '@/lib/observability/report';

export default function BackofficeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { where: 'boundary:backoffice', extra: { digest: error.digest } });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15">
          <AlertTriangle className="h-7 w-7 text-amber-500" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Une erreur est survenue</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette page n&apos;a pas pu s&apos;afficher correctement. Réessayez ; si le problème
          persiste, revenez au tableau de bord.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-muted-foreground/70">Réf : {error.digest}</p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-[#606338] px-4 py-2 text-sm font-medium text-white hover:bg-[#4d4f2e] transition-colors"
          >
            <RotateCw className="h-4 w-4" />
            Réessayer
          </button>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <Home className="h-4 w-4" />
            Tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
