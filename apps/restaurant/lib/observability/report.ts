// ───────────────────────────────────────────────────────────────────────────
// Single observability seam for the whole app.
//
// Every layer — React error boundaries, the global unhandled-error net, the
// client fetch helper, and server route handlers — funnels through reportError().
// Today it logs locally; wiring Sentry (or any tracker) is a one-file change here,
// so no call site ever imports the SDK directly.
//
//   reportError(err, { where: 'inventory.save', extra: { itemId } });
//
// Isomorphic: safe on both server and client.
// ───────────────────────────────────────────────────────────────────────────

import * as Sentry from '@sentry/nextjs';

export interface ErrorContext {
  /** Logical origin, e.g. 'api:/api/reports', 'boundary:backoffice', 'fetch'. */
  where?: string;
  /** Arbitrary structured context attached to the report. */
  extra?: Record<string, unknown>;
  /** Severity hint for the tracker; defaults to 'error'. */
  level?: 'error' | 'warning' | 'info';
}

/**
 * Report an error to logs (and, once provisioned, to Sentry).
 * Never throws — reporting must not create a second failure.
 */
export function reportError(error: unknown, context: ErrorContext = {}): void {
  const { where = 'app', extra, level = 'error' } = context;
  try {
    const tag = `[${where}]`;
    if (level === 'warning') console.warn(tag, error, extra ?? '');
    else if (level === 'info') console.info(tag, error, extra ?? '');
    else console.error(tag, error, extra ?? '');

    // ── Forward to Sentry ──────────────────────────────────────────────────
    // level 'error' → captureException (full issue + stack); 'warning'/'info'
    // → captureMessage at that level. Context is attached as extra + a `where` tag.
    const scope = { level, tags: { where }, extra: extra ?? {} };
    if (level === 'error') {
      Sentry.captureException(error, scope);
    } else {
      Sentry.captureMessage(errorMessage(error, where), scope);
    }
  } catch {
    // Swallow — observability must never crash the caller.
  }
}

/** Normalise anything thrown into a human-readable string. */
export function errorMessage(error: unknown, fallback = 'Une erreur est survenue'): string {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === 'string') return error || fallback;
  if (error && typeof error === 'object' && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string' && m) return m;
  }
  return fallback;
}
