import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant, enforce } from "@/lib/auth";
import { withErrorHandler, ApiRouteError } from "@/lib/api/handler";
import { staffSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const COLS = `id, first_name, last_name, "position", phone, is_active`;

export const POST = withErrorHandler(async (req: Request) => {
  const denied = await enforce("personnel.write");
  if (denied) return denied;
  return withTenant(async (ctx) => {
    const b = staffSchema.parse(await req.json());
    const { rows } = await db.query<Record<string, unknown>>(
      `INSERT INTO staff_members (tenant_id, first_name, last_name, "position", phone, is_active)
       VALUES ($1,$2,$3,$4,$5,true) RETURNING ${COLS}`,
      [ctx.tenantId, b.first_name, b.last_name, b.position || null, b.phone || null],
    );
    return NextResponse.json({ item: rows[0] });
  });
});

export const PATCH = withErrorHandler(async (req: Request) => {
  const denied = await enforce("personnel.write");
  if (denied) return denied;
  return withTenant(async (ctx) => {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new ApiRouteError("id requis", 400);
    const b = staffSchema.parse(await req.json());
    const { rows } = await db.query<Record<string, unknown>>(
      `UPDATE staff_members SET first_name=$1, last_name=$2, "position"=$3, phone=$4, updated_at=now()
        WHERE id=$5 AND tenant_id=$6 RETURNING ${COLS}`,
      [b.first_name, b.last_name, b.position || null, b.phone || null, id, ctx.tenantId],
    );
    if (rows.length === 0) throw new ApiRouteError("Employé introuvable.", 404);
    return NextResponse.json({ item: rows[0] });
  });
});

export const DELETE = withErrorHandler(async (req: Request) => {
  const denied = await enforce("personnel.write");
  if (denied) return denied;
  return withTenant(async (ctx) => {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new ApiRouteError("id requis", 400);
    // soft delete (is_active=false) to preserve attendance history
    const { rowCount } = await db.query("UPDATE staff_members SET is_active=false WHERE id=$1 AND tenant_id=$2", [id, ctx.tenantId]);
    if (!rowCount) throw new ApiRouteError("Employé introuvable.", 404);
    return NextResponse.json({ ok: true });
  });
});
