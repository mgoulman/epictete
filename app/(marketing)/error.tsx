'use client';

// Public (marketing) route error boundary. Dark-themed to match the public site.

import { useEffect } from 'react';
import Link from 'next/link';
import { reportError } from '@/lib/observability/report';

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { where: 'boundary:marketing', extra: { digest: error.digest } });
  }, [error]);

  return (
    <div className="dark flex min-h-screen items-center justify-center bg-[#0c0c0d] px-6 text-center text-[#e7e7e5]">
      <div className="max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#606338]/20 text-2xl">
          ⚠️
        </div>
        <h1 className="text-2xl font-semibold">Oups, une erreur est survenue</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#a1a1a0]">
          Nous n&apos;avons pas pu afficher cette page. Réessayez, ou revenez à l&apos;accueil.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-[#606338] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d4f2e]"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-[#e7e7e5] transition-colors hover:bg-white/5"
          >
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
