// Sentry initialisation for the browser/client runtime. Next.js loads this
// automatically. Baseline = error monitoring + tracing. Session Replay is
// intentionally deferred (records user sessions — opt in explicitly).
import * as Sentry from '@sentry/nextjs';
import { isBenignNetworkError, BENIGN_IGNORE_ERRORS } from '@/lib/observability/sentry-ignore';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 100% traces in dev, 10% in production.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  enableLogs: true,

  environment: process.env.NODE_ENV,

  // Drop benign fetch-abort noise (AbortError / "aborted" from cancelled requests).
  ignoreErrors: [...BENIGN_IGNORE_ERRORS, 'AbortError'],
  beforeSend(event, hint) {
    if (isBenignNetworkError(hint?.originalException)) return null;
    return event;
  },

  // Session Replay (opt-in later):
  // integrations: [Sentry.replayIntegration()],
  // replaysSessionSampleRate: 0.1,
  // replaysOnErrorSampleRate: 1.0,
});

// Capture App Router client navigation transitions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
