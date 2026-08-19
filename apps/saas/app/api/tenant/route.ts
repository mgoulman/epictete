import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant, enforce } from "@/lib/auth";
import { withErrorHandler } from "@/lib/api/handler";
import { tenantProfileSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

// GET /api/tenant → the restaurant profile + default branch
export const GET = withErrorHandler(async () =>
  withTenant(async () => {
    const tenant =
      (await db.query<Record<string, unknown>>(
        "SELECT id, slug, name, city, ice, rc, billing_email, status FROM tenants LIMIT 1",
      )).rows[0] ?? null;
    const branch =
      (await db.query<{ id: string; name: string }>(
        "SELECT id, name FROM branches ORDER BY is_default DESC, name LIMIT 1",
      )).rows[0] ?? null;
    return NextResponse.json({ tenant, branch });
  }),
);

// PUT /api/tenant → update profile (name/city/ICE/RC/billing_email) + default branch name
export const PUT = withErrorHandler(async (req: Request) => {
  const denied = await enforce("settings.manage");
  if (denied) return denied;

  return withTenant(async (ctx) => {
    const b = tenantProfileSchema.parse(await req.json());

    // Explicit tenant predicate (defense-in-depth on top of RLS).
    const { rows } = await db.query<Record<string, unknown>>(
      `UPDATE tenants SET name = $1, city = $2, ice = $3, rc = $4, billing_email = $5, updated_at = now()
         WHERE id = $6
       RETURNING id, slug, name, city, ice, rc, billing_email`,
      [b.name, b.city ?? null, b.ice ?? null, b.rc ?? null, b.billing_email || null, ctx.tenantId],
    );

    let branch = null;
    if (b.branch_name) {
      branch =
        (await db.query<{ id: string; name: string }>(
          `UPDATE branches SET name = $1
             WHERE tenant_id = $2 AND id = (SELECT id FROM branches WHERE tenant_id = $2 ORDER BY is_default DESC, name LIMIT 1)
           RETURNING id, name`,
          [b.branch_name, ctx.tenantId],
        )).rows[0] ?? null;
    }

    return NextResponse.json({ tenant: rows[0], branch });
  });
});
