import { redirect } from "next/navigation";
import { runWithTenant } from "@epictete/core/db";
import { db } from "@/lib/db";
import { resolveTenant } from "@/lib/tenant";
import { getSaasSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExpensesManager, type Expense } from "./ExpensesManager";

export const dynamic = "force-dynamic";

export default async function DepensesPage() {
  const [ctx, session] = await Promise.all([resolveTenant(), getSaasSession()]);
  if (!ctx) redirect("/login");
  const canWrite = session?.role === "owner" || session?.role === "admin" || (session?.perms.includes("finance.write") ?? false);

  const items = await runWithTenant({ tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role }, async () =>
    (
      await db.query<Expense>(
        "SELECT id, expense_date, amount, payment_method, category, description FROM expenses ORDER BY expense_date DESC, created_at DESC",
      )
    ).rows,
  );

  return (
    <>
      <PageHeader title="Dépenses" subtitle="Où partent les dirhams — dépenses cash, carte pro et TPE." />
      <ExpensesManager items={items} canWrite={canWrite} />
    </>
  );
}
