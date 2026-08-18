import { cookies } from "next/headers";
import { verifySaasJWT } from "@epictete/core/auth";
import type { TenantContext } from "@epictete/core/db";

export const SAAS_COOKIE = "saas_token";

/**
 * The request boundary: resolve the tenant context from the session cookie.
 * Route handlers pass this to runWithTenant() so the db layer is tenant-scoped.
 * Returns null when unauthenticated (caller replies 401).
 */
export async function resolveTenant(): Promise<TenantContext | null> {
  const token = (await cookies()).get(SAAS_COOKIE)?.value;
  if (!token) return null;
  const claims = await verifySaasJWT(token);
  if (!claims?.tenant_id) return null;
  return { tenantId: claims.tenant_id, userId: claims.sub, role: claims.role };
}
