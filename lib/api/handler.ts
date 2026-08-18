// ───────────────────────────────────────────────────────────────────────────
// Server-side API helpers. Standardises error responses ({ error, status }) and
// routes every unhandled throw through reportError(), so route handlers don't
// each hand-roll try/catch + console.error + NextResponse.json shapes.
//
//   import { withErrorHandler, apiError, ApiRouteError } from '@/lib/api/handler';
//
//   export const POST = withErrorHandler(async (req) => {
//     const body = await req.json();
//     if (!body.name) throw new ApiRouteError('Le nom est requis', 400);
//     ...
//     return NextResponse.json({ success: true });
//   });
//
// A thrown ApiRouteError becomes its { status, message }; anything else becomes
// a logged 500 with a generic message (no internal detail leaked to the client).
// ───────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { reportError } from '@/lib/observability/report';

/** Throw inside a handler to return a specific status + client-safe message. */
export class ApiRouteError extends Error {
  readonly status: number;
  readonly extra?: Record<string, unknown>;
  constructor(message: string, status = 400, extra?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiRouteError';
    this.status = status;
    this.extra = extra;
  }
}

/** Build a consistent JSON error response. */
export function apiError(message: string, status = 500, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

type RouteHandler<Ctx> = (request: Request, context: Ctx) => Promise<Response> | Response;

/**
 * Wrap a route handler so any throw is caught, reported, and returned as a
 * consistent JSON error instead of a raw unhandled 500.
 */
export function withErrorHandler<Ctx = unknown>(handler: RouteHandler<Ctx>): RouteHandler<Ctx> {
  return async (request: Request, context: Ctx) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiRouteError) {
        // Expected, client-safe error — report at warning level, no stack noise.
        reportError(error, { where: `api:${safePath(request)}`, level: 'warning', extra: error.extra });
        return apiError(error.message, error.status, error.extra);
      }
      reportError(error, { where: `api:${safePath(request)}` });
      return apiError('Une erreur interne est survenue', 500);
    }
  };
}

function safePath(request: Request): string {
  try { return new URL(request.url).pathname; } catch { return 'unknown'; }
}
