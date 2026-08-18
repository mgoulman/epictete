// Server-side registration hook. Loads the right Sentry config per runtime and
// wires automatic capture of unhandled server-side request errors.
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Captures unhandled errors thrown in server components, route handlers,
// server actions, etc. Requires @sentry/nextjs >= 8.28.0.
export const onRequestError = Sentry.captureRequestError;
