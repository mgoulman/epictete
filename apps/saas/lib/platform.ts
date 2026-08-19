import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyPlatformJWT } from "@epictete/core/auth";
import { db } from "@/lib/db";

export const PLATFORM_COOKIE = "saas_admin_token";

export interface PlatformAdmin {
  userId: string;
  name: string;
  email: string;
}

/**
 * Resolve the current platform (super) admin from the admin cookie, re-checking the
 * is_platform_admin flag live (so a revoked admin can't keep a valid token). Returns
 * null when there's no valid platform session. Platform-level — no tenant context.
 */
export async function resolvePlatformAdmin(): Promise<PlatformAdmin | null> {
  const token = (await cookies()).get(PLATFORM_COOKIE)?.value;
  if (!token) return null;
  const claims = await verifyPlatformJWT(token);
  if (!claims) return null;
  const { rows } = await db.unsafeQuery<{ name: string; email: string }>(
    `SELECT COALESCE(NULLIF(p.full_name,''), u.email) AS name, u.email
       FROM users u LEFT JOIN profiles p ON p.id = u.id
      WHERE u.id = $1 AND u.is_platform_admin = true`,
    [claims.sub],
  );
  if (rows.length === 0) return null;
  return { userId: claims.sub, name: rows[0].name, email: rows[0].email };
}

/** Route guard: the admin, or a 401 Response. */
export async function requirePlatformAdmin(): Promise<PlatformAdmin | Response> {
  const admin = await resolvePlatformAdmin();
  return admin ?? NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
