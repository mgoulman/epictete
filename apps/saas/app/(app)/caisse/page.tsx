import { redirect } from "next/navigation";
import { runWithTenant } from "@epictete/core/db";
import { db } from "@/lib/db";
import { resolveTenant } from "@/lib/tenant";
import { getSessionView } from "@/lib/session";
import { num, emptyCaisse, type CaisseData, type DepenseItem, type PaymentSource } from "@/lib/caisse";
import { todayISO } from "@/lib/format";
import { CaisseForm } from "./CaisseForm";

export const dynamic = "force-dynamic";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function rowToCaisse(row: Record<string, unknown>): CaisseData {
  const paid = Array.isArray(row.paid_items) ? row.paid_items : [];
  return {
    entry_date: String(row.entry_date).slice(0, 10),
    total_ca: num(row.total_ca),
    total_cb: num(row.total_cb),
    glovo_ttc_espece: num(row.glovo_ttc_espece),
    glovo_ttc_online: num(row.glovo_ttc_online),
    payment_sources: (Array.isArray(row.payment_sources) ? row.payment_sources : []).map(
      (s: Record<string, unknown>): PaymentSource => ({
        name: String(s?.name ?? ""),
        amount: num(s?.amount),
        counts_as_cash: !!s?.counts_as_cash,
      }),
    ),
    depenses: paid.map((d: Record<string, unknown>): DepenseItem => ({ label: String(d?.label ?? ""), amount: num(d?.amount) })),
    manager_name: String(row.manager_name ?? ""),
    especes_note: String(row.especes_note ?? ""),
  };
}

export default async function CaissePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const date = sp.date && ISO_DATE.test(sp.date) ? sp.date : todayISO();

  const [session, ctx] = await Promise.all([getSessionView(), resolveTenant()]);
  if (!session || !ctx) redirect("/login");

  const existing = await runWithTenant({ tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role }, async () => {
    try {
      const { rows } = await db.query<Record<string, unknown>>(
        "SELECT * FROM cash_sheets WHERE entry_date = $1 LIMIT 1",
        [date],
      );
      return rows[0] ? rowToCaisse(rows[0]) : null;
    } catch {
      return null;
    }
  });

  const initial = existing ?? { ...emptyCaisse(date), manager_name: session.user.name };

  return (
    <CaisseForm
      initial={initial}
      isExisting={!!existing}
      branchName={session.branch?.name ?? session.tenant.name}
    />
  );
}
