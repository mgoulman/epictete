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

// ─── PII scrubbing ──────────────────────────────────────────────────────────
// Defence-in-depth so error telemetry never exports personal / sensitive data
// (staff salaries, phone numbers, tokens, cross-tenant identifiers) to Sentry —
// a Law 09-08 cross-border-transfer and (for the SaaS) cross-tenant concern.
// Applied in beforeSend, in addition to includeLocalVariables being OFF.

const PII_KEY_PATTERN =
  /pass(word)?|secret|token|auth|cookie|session|salaire|salary|wage|paie|payroll|phone|tel|telephone|whatsapp|mobile|email|e-mail|address|adresse|cin|ice|rc_?num|iban|rib|card|cvv|dob|birth|ssn/i;
const REDACTED = '[redacted]';

function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value;
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = PII_KEY_PATTERN.test(k) ? REDACTED : scrubValue(v, depth + 1);
    }
    return out;
  }
  return value;
}

/** Redact PII-looking keys anywhere in a Sentry event (extra, contexts, request, frame vars). */
export function scrubEventPII<T extends object>(event: T): T {
  try {
    const e = event as {
      extra?: unknown;
      contexts?: unknown;
      request?: { data?: unknown; cookies?: unknown; headers?: unknown };
      exception?: { values?: Array<{ stacktrace?: { frames?: Array<{ vars?: unknown }> } }> };
    };
    if (e.extra) e.extra = scrubValue(e.extra);
    if (e.contexts) e.contexts = scrubValue(e.contexts);
    if (e.request) {
      if (e.request.data) e.request.data = scrubValue(e.request.data);
      e.request.cookies = REDACTED;
      if (e.request.headers) e.request.headers = scrubValue(e.request.headers);
    }
    // Stack-frame local variables (belt-and-braces; includeLocalVariables is off).
    for (const ex of e.exception?.values ?? []) {
      for (const frame of ex.stacktrace?.frames ?? []) {
        if (frame.vars) frame.vars = scrubValue(frame.vars);
      }
    }
  } catch {
    // never let scrubbing throw inside beforeSend
  }
  return event;
}
