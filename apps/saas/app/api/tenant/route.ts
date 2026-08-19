import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant, enforce } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/tenant → the restaurant profile + default branch
export async function GET() {
  return withTenant(async () => {
    const tenant =
      (await db.query<Record<string, unknown>>(
        "SELECT id, slug, name, city, ice, rc, billing_email, status FROM tenants LIMIT 1",
      )).rows[0] ?? null;
    const branch =
      (await db.query<{ id: string; name: string }>(
        "SELECT id, name FROM branches ORDER BY is_default DESC, name LIMIT 1",
      )).rows[0] ?? null;
    return NextResponse.json({ tenant, branch });
  });
}

// PUT /api/tenant → update the restaurant profile (name/city/ICE/RC/billing_email) + branch name
export async function PUT(req: Request) {
  const denied = await enforce("settings.manage");
  if (denied) return denied;

  return withTenant(async () => {
    let b: Record<string, unknown>;
    try {
      b = await req.json();
    } catch {
      return NextResponse.json({ error: "corps invalide" }, { status: 400 });
    }
    const name = String(b.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Le nom du restaurant est requis." }, { status: 400 });

    const str = (v: unknown) => {
      const s = String(v ?? "").trim();
      return s === "" ? null : s;
    };

    const { rows } = await db.query<Record<string, unknown>>(
      `UPDATE tenants SET name = $1, city = $2, ice = $3, rc = $4, billing_email = $5, updated_at = now()
         WHERE id = (SELECT id FROM tenants LIMIT 1)
       RETURNING id, slug, name, city, ice, rc, billing_email`,
      [name, str(b.city), str(b.ice), str(b.rc), str(b.billing_email)],
    );

    const branchName = str(b.branch_name);
    let branch = null;
    if (branchName) {
      branch =
        (await db.query<{ id: string; name: string }>(
          `UPDATE branches SET name = $1
             WHERE id = (SELECT id FROM branches ORDER BY is_default DESC, name LIMIT 1)
           RETURNING id, name`,
          [branchName],
        )).rows[0] ?? null;
    }

    return NextResponse.json({ tenant: rows[0], branch });
  });
}
