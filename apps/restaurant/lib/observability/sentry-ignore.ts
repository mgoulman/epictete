// Benign, high-volume errors we never want to report to Sentry.
// These fire constantly and aren't actionable: a client aborting an in-flight
// request (navigation, React fetch cancellation, HMR reloads) surfaces as
// `Error: aborted` / ECONNRESET / premature stream close. Not real failures.

const BENIGN_CODES = new Set([
  'ECONNRESET',
  'ECONNABORTED',
  'EPIPE',
  'ERR_STREAM_PREMATURE_CLOSE',
]);

export function isBenignNetworkError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: unknown; message?: unknown };
  if (typeof e.code === 'string' && BENIGN_CODES.has(e.code)) return true;
  const msg = typeof e.message === 'string' ? e.message.toLowerCase() : '';
  return (
    msg === 'aborted' ||
    msg.includes('aborted') ||
    msg.includes('econnreset') ||
    msg.includes('premature close')
  );
}

// Message substrings for Sentry's built-in `ignoreErrors` (belt-and-braces
// alongside the beforeSend filter, which catches by error code too).
export const BENIGN_IGNORE_ERRORS = [
  'aborted',
  'ECONNRESET',
  'ECONNABORTED',
  'ERR_STREAM_PREMATURE_CLOSE',
];
