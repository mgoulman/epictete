import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant, enforce } from "@/lib/auth";
import { withErrorHandler, ApiRouteError } from "@/lib/api/handler";
import { todayISO } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUSES = ["present", "absent", "late"];

// POST /api/attendance { staff_id, status } → set today's attendance for a staff member
export const POST = withErrorHandler(async (req: Request) => {
  const denied = await enforce("personnel.write");
  if (denied) return denied;
  return withTenant(async (ctx) => {
    const b = (await req.json().catch(() => ({}))) as { staff_id?: string; status?: string };
    if (!b.staff_id) throw new ApiRouteError("staff_id requis", 400);
    if (!b.status || !STATUSES.includes(b.status)) throw new ApiRouteError("Statut invalide.", 400);
    const staff = await db.query("SELECT 1 FROM staff_members WHERE id=$1 AND tenant_id=$2", [b.staff_id, ctx.tenantId]);
    if (staff.rows.length === 0) throw new ApiRouteError("Employé introuvable.", 404);
    await db.query(
      `INSERT INTO attendance (tenant_id, staff_id, date, status) VALUES ($1,$2,$3,$4)
       ON CONFLICT (tenant_id, staff_id, date) DO UPDATE SET status = EXCLUDED.status`,
      [ctx.tenantId, b.staff_id, todayISO(), b.status],
    );
    return NextResponse.json({ ok: true });
  });
});
