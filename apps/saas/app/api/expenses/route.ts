import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant, enforce } from "@/lib/auth";
import { withErrorHandler, ApiRouteError } from "@/lib/api/handler";
import { expenseSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const COLS = "id, expense_date, amount, payment_method, category, description";

export const POST = withErrorHandler(async (req: Request) => {
  const denied = await enforce("finance.write");
  if (denied) return denied;
  return withTenant(async (ctx) => {
    const b = expenseSchema.parse(await req.json());
    const branch = (await db.query<{ id: string }>("SELECT id FROM branches ORDER BY is_default DESC, name LIMIT 1")).rows[0]?.id ?? null;
    const { rows } = await db.query<Record<string, unknown>>(
      `INSERT INTO expenses (tenant_id, branch_id, expense_date, amount, payment_method, category, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${COLS}`,
      [ctx.tenantId, branch, b.expense_date, b.amount, b.payment_method, b.category, b.description || null, ctx.userId ?? null],
    );
    return NextResponse.json({ item: rows[0] });
  });
});

export const PATCH = withErrorHandler(async (req: Request) => {
  const denied = await enforce("finance.write");
  if (denied) return denied;
  return withTenant(async (ctx) => {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new ApiRouteError("id requis", 400);
    const b = expenseSchema.parse(await req.json());
    const { rows } = await db.query<Record<string, unknown>>(
      `UPDATE expenses SET expense_date=$1, amount=$2, payment_method=$3, category=$4, description=$5, updated_at=now()
        WHERE id=$6 AND tenant_id=$7 RETURNING ${COLS}`,
      [b.expense_date, b.amount, b.payment_method, b.category, b.description || null, id, ctx.tenantId],
    );
    if (rows.length === 0) throw new ApiRouteError("Dépense introuvable.", 404);
    return NextResponse.json({ item: rows[0] });
  });
});

export const DELETE = withErrorHandler(async (req: Request) => {
  const denied = await enforce("finance.write");
  if (denied) return denied;
  return withTenant(async (ctx) => {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new ApiRouteError("id requis", 400);
    const { rowCount } = await db.query("DELETE FROM expenses WHERE id=$1 AND tenant_id=$2", [id, ctx.tenantId]);
    if (!rowCount) throw new ApiRouteError("Dépense introuvable.", 404);
    return NextResponse.json({ ok: true });
  });
});
