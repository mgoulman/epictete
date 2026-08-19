import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant, enforce } from "@/lib/auth";
import { withErrorHandler, ApiRouteError } from "@/lib/api/handler";
import { inventoryItemSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const COLS = "id, name, category, quantity, unit, minimum_stock, cost_per_unit, last_purchase_price";

// POST /api/inventory → create an item
export const POST = withErrorHandler(async (req: Request) => {
  const denied = await enforce("inventory.write");
  if (denied) return denied;
  return withTenant(async (ctx) => {
    const b = inventoryItemSchema.parse(await req.json());
    const branch = (await db.query<{ id: string }>("SELECT id FROM branches ORDER BY is_default DESC, name LIMIT 1")).rows[0]?.id ?? null;
    const { rows } = await db.query<Record<string, unknown>>(
      `INSERT INTO inventory_items (tenant_id, branch_id, name, category, quantity, unit, minimum_stock, cost_per_unit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${COLS}`,
      [ctx.tenantId, branch, b.name, b.category || null, b.quantity, b.unit, b.minimum_stock, b.cost_per_unit],
    );
    return NextResponse.json({ item: rows[0] });
  });
});

// PATCH /api/inventory?id= → update an item
export const PATCH = withErrorHandler(async (req: Request) => {
  const denied = await enforce("inventory.write");
  if (denied) return denied;
  return withTenant(async (ctx) => {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new ApiRouteError("id requis", 400);
    const b = inventoryItemSchema.parse(await req.json());
    const { rows } = await db.query<Record<string, unknown>>(
      `UPDATE inventory_items SET name=$1, category=$2, quantity=$3, unit=$4, minimum_stock=$5, cost_per_unit=$6, updated_at=now()
        WHERE id=$7 AND tenant_id=$8 RETURNING ${COLS}`,
      [b.name, b.category || null, b.quantity, b.unit, b.minimum_stock, b.cost_per_unit, id, ctx.tenantId],
    );
    if (rows.length === 0) throw new ApiRouteError("Produit introuvable.", 404);
    return NextResponse.json({ item: rows[0] });
  });
});

// DELETE /api/inventory?id= → delete an item
export const DELETE = withErrorHandler(async (req: Request) => {
  const denied = await enforce("inventory.write");
  if (denied) return denied;
  return withTenant(async (ctx) => {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new ApiRouteError("id requis", 400);
    const { rowCount } = await db.query("DELETE FROM inventory_items WHERE id=$1 AND tenant_id=$2", [id, ctx.tenantId]);
    if (!rowCount) throw new ApiRouteError("Produit introuvable.", 404);
    return NextResponse.json({ ok: true });
  });
});
