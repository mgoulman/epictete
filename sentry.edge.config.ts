// Sentry initialisation for the Edge runtime (middleware, edge routes).
// Loaded by instrumentation.ts when NEXT_RUNTIME === 'edge'.
import * as Sentry from '@sentry/nextjs';
import { isBenignNetworkError, BENIGN_IGNORE_ERRORS } from '@/lib/observability/sentry-ignore';

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  enableLogs: true,

  environment: process.env.NODE_ENV,

  // Drop benign client-abort / reset noise (Error: aborted, ECONNRESET, …).
  ignoreErrors: BENIGN_IGNORE_ERRORS,
  beforeSend(event, hint) {
    if (isBenignNetworkError(hint?.originalException)) return null;
    return event;
  },
});
