import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant, enforce } from "@/lib/auth";
import { withErrorHandler, ApiRouteError } from "@/lib/api/handler";
import { vendorSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const COLS = "id, name, contact_name, phone, category";

export const POST = withErrorHandler(async (req: Request) => {
  const denied = await enforce("inventory.write");
  if (denied) return denied;
  return withTenant(async (ctx) => {
    const b = vendorSchema.parse(await req.json());
    const { rows } = await db.query<Record<string, unknown>>(
      `INSERT INTO vendors (tenant_id, name, contact_name, phone, category) VALUES ($1,$2,$3,$4,$5) RETURNING ${COLS}`,
      [ctx.tenantId, b.name, b.contact_name || null, b.phone || null, b.category || null],
    );
    return NextResponse.json({ item: rows[0] });
  });
});

export const PATCH = withErrorHandler(async (req: Request) => {
  const denied = await enforce("inventory.write");
  if (denied) return denied;
  return withTenant(async (ctx) => {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new ApiRouteError("id requis", 400);
    const b = vendorSchema.parse(await req.json());
    const { rows } = await db.query<Record<string, unknown>>(
      `UPDATE vendors SET name=$1, contact_name=$2, phone=$3, category=$4, updated_at=now()
        WHERE id=$5 AND tenant_id=$6 RETURNING ${COLS}`,
      [b.name, b.contact_name || null, b.phone || null, b.category || null, id, ctx.tenantId],
    );
    if (rows.length === 0) throw new ApiRouteError("Fournisseur introuvable.", 404);
    return NextResponse.json({ item: rows[0] });
  });
});

export const DELETE = withErrorHandler(async (req: Request) => {
  const denied = await enforce("inventory.write");
  if (denied) return denied;
  return withTenant(async (ctx) => {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new ApiRouteError("id requis", 400);
    const { rowCount } = await db.query("DELETE FROM vendors WHERE id=$1 AND tenant_id=$2", [id, ctx.tenantId]);
    if (!rowCount) throw new ApiRouteError("Fournisseur introuvable.", 404);
    return NextResponse.json({ ok: true });
  });
});
