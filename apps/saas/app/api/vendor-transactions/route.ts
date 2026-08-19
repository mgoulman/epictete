import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant, enforce } from "@/lib/auth";
import { withErrorHandler, ApiRouteError } from "@/lib/api/handler";
import { vendorTxnSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

// POST /api/vendor-transactions → record a debt (facture) or payment for a vendor
export const POST = withErrorHandler(async (req: Request) => {
  const denied = await enforce("finance.write");
  if (denied) return denied;
  return withTenant(async (ctx) => {
    const b = vendorTxnSchema.parse(await req.json());
    // ensure the vendor belongs to this tenant (RLS also enforces, this gives a clean 404)
    const v = await db.query("SELECT 1 FROM vendors WHERE id=$1 AND tenant_id=$2", [b.vendor_id, ctx.tenantId]);
    if (v.rows.length === 0) throw new ApiRouteError("Fournisseur introuvable.", 404);
    const { rows } = await db.query<Record<string, unknown>>(
      `INSERT INTO vendor_transactions (tenant_id, vendor_id, type, amount, date, description)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, type, amount, date, description`,
      [ctx.tenantId, b.vendor_id, b.type, b.amount, b.date, b.description || null],
    );
    return NextResponse.json({ item: rows[0] });
  });
});
