// ───────────────────────────────────────────────────────────────────────────
// Single observability seam for the whole app.
//
// Every layer — React error boundaries, the global unhandled-error net, the
// client fetch helper, and server route handlers — funnels through reportError().
// It logs locally; wiring a tracker (Sentry or any other) is a one-file change
// here, so no call site ever imports an SDK directly.
//
//   reportError(err, { where: 'reports.save', extra: { entryId } });
//
// Isomorphic: safe on both server and client.
// ───────────────────────────────────────────────────────────────────────────

export interface ErrorContext {
  /** Logical origin, e.g. 'api:/api/reports', 'boundary:backoffice', 'fetch'. */
  where?: string;
  /** Arbitrary structured context attached to the report. */
  extra?: Record<string, unknown>;
  /** Severity hint for the tracker; defaults to 'error'. */
  level?: 'error' | 'warning' | 'info';
}

/**
 * Report an error to logs. Never throws — reporting must not create a second
 * failure.
 */
export function reportError(error: unknown, context: ErrorContext = {}): void {
  const { where = 'app', extra, level = 'error' } = context;
  try {
    const tag = `[${where}]`;
    if (level === 'warning') console.warn(tag, error, extra ?? '');
    else if (level === 'info') console.info(tag, error, extra ?? '');
    else console.error(tag, error, extra ?? '');
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
