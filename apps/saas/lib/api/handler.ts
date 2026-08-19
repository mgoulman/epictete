import { NextResponse } from "next/server";
import { reportError } from "@/lib/observability/report";
import { ZodError } from "zod";

/** Throw inside a handler to return a specific status + client-safe message. */
export class ApiRouteError extends Error {
  readonly status: number;
  readonly extra?: Record<string, unknown>;
  constructor(message: string, status = 400, extra?: Record<string, unknown>) {
    super(message);
    this.name = "ApiRouteError";
    this.status = status;
    this.extra = extra;
  }
}

/** Consistent JSON error response. */
export function apiError(message: string, status = 500, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

type RouteHandler<Ctx> = (request: Request, context: Ctx) => Promise<Response> | Response;

/**
 * Wrap a route handler so any throw is caught, reported, and returned as a
 * consistent JSON error. ApiRouteError → its status/message; ZodError → 400 with
 * the first field message; anything else → logged 500 with a generic message.
 */
export function withErrorHandler<Ctx = unknown>(handler: RouteHandler<Ctx>): RouteHandler<Ctx> {
  return async (request: Request, context: Ctx) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiRouteError) {
        reportError(error, { where: `api:${safePath(request)}`, level: "warning", extra: error.extra });
        return apiError(error.message, error.status, error.extra);
      }
      if (error instanceof ZodError) {
        const first = error.issues[0];
        const msg = first ? `${first.path.join(".") || "champ"} : ${first.message}` : "Données invalides.";
        return apiError(msg, 400, { issues: error.issues });
      }
      reportError(error, { where: `api:${safePath(request)}` });
      return apiError("Une erreur interne est survenue.", 500);
    }
  };
}

function safePath(request: Request): string {
  try {
    return new URL(request.url).pathname;
  } catch {
    return "unknown";
  }
}
