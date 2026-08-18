'use client';

// Root error boundary — catches failures in the root layout itself, above every
// provider. It must render its own <html>/<body>, so it uses inline styles
// (theme tokens/fonts may be unavailable this high up).

import { useEffect } from 'react';
import { reportError } from '@/lib/observability/report';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { where: 'boundary:global', extra: { digest: error.digest } });
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0c0c0d',
          color: '#e7e7e5',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          padding: '1.5rem',
        }}
      >
        <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '9999px',
              background: 'rgba(96,99,56,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              fontSize: 26,
            }}
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
            Une erreur inattendue est survenue
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#a1a1a0', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
            L&apos;application a rencontré un problème. Vous pouvez réessayer ; si le problème
            persiste, rechargez la page.
          </p>
          <button
            onClick={reset}
            style={{
              appearance: 'none',
              border: 'none',
              cursor: 'pointer',
              background: '#606338',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 600,
              padding: '0.6rem 1.4rem',
              borderRadius: '0.6rem',
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
