import { SignJWT, jwtVerify } from "jose";

/**
 * SaaS session claims. Unlike the single-tenant app's `{sub, role, perms}`, the
 * SaaS token carries the ACTIVE tenant so the request boundary can scope the db
 * layer without a lookup. Role/perms are resolved from the active membership at
 * sign time (on login / tenant switch), refreshed on the next token issue.
 */
export interface SaasClaims {
  sub: string; // user id
  tenant_id: string;
  tenant_slug?: string;
  role?: string;
}

function getSecret(): Uint8Array {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET environment variable is required (no default).");
  return new TextEncoder().encode(value);
}

export async function signSaasJWT(claims: SaasClaims, expiresIn: string = "7d"): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

export async function verifySaasJWT(token: string): Promise<SaasClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string" || typeof payload.tenant_id !== "string") return null;
    return {
      sub: payload.sub,
      tenant_id: payload.tenant_id as string,
      tenant_slug: payload.tenant_slug as string | undefined,
      role: payload.role as string | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Platform-admin claims — a cross-tenant operator (provisioning, cohort management)
 * that belongs to NO tenant. Deliberately separate from SaasClaims so tenant tokens
 * always carry a tenant_id and can never be confused with a platform token.
 */
export interface PlatformClaims {
  sub: string;
  platform_admin: true;
}

export async function signPlatformJWT(claims: PlatformClaims, expiresIn: string = "7d"): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

export async function verifyPlatformJWT(token: string): Promise<PlatformClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string" || payload.platform_admin !== true) return null;
    return { sub: payload.sub, platform_admin: true };
  } catch {
    return null;
  }
}
