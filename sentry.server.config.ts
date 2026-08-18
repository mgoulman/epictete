// Sentry initialisation for the Node.js server runtime.
// Loaded by instrumentation.ts when NEXT_RUNTIME === 'nodejs'.
import * as Sentry from '@sentry/nextjs';
import { isBenignNetworkError, BENIGN_IGNORE_ERRORS } from '@/lib/observability/sentry-ignore';

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 100% traces in dev, 10% in production.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Attach local variable values to stack frames for richer server traces.
  includeLocalVariables: true,

  enableLogs: true,

  environment: process.env.NODE_ENV,

  // Drop benign client-abort / reset noise (Error: aborted, ECONNRESET, …).
  ignoreErrors: BENIGN_IGNORE_ERRORS,
  beforeSend(event, hint) {
    if (isBenignNetworkError(hint?.originalException)) return null;
    return event;
  },
});
