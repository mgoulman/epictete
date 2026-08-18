import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Request-scoped tenant context. Set once at the request boundary (middleware /
 * route entry) and read by the db layer to scope every query. This is what lets
 * the compat layer inject the tenant into RLS without threading it through every
 * function call.
 */
export interface TenantContext {
  tenantId: string;
  userId?: string;
  role?: string;
  /** Explicit platform-admin escape (cross-tenant). Never set from tenant input. */
  platformAdmin?: boolean;
}

const storage = new AsyncLocalStorage<TenantContext>();

/** Run `fn` with the given tenant context available to the db layer. */
export function runWithTenant<T>(ctx: TenantContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(ctx, fn);
}

/** The active tenant context, or undefined outside a runWithTenant scope. */
export function getTenantContext(): TenantContext | undefined {
  return storage.getStore();
}

/** The active tenant context, or throw (fail-closed) if there is none. */
export function requireTenantContext(): TenantContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error("No tenant context — call runWithTenant() at the request boundary.");
  }
  return ctx;
}
