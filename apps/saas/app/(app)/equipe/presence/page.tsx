import { redirect } from "next/navigation";
import { runWithTenant } from "@epictete/core/db";
import { db } from "@/lib/db";
import { resolveTenant } from "@/lib/tenant";
import { getSaasSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { todayISO } from "@/lib/format";
import { PresenceManager, type Row } from "./PresenceManager";

export const dynamic = "force-dynamic";

export default async function PresencePage() {
  const [ctx, session] = await Promise.all([resolveTenant(), getSaasSession()]);
  if (!ctx) redirect("/login");
  const canWrite = session?.role === "owner" || session?.role === "admin" || (session?.perms.includes("personnel.write") ?? false);
  const today = todayISO();

  const rows = await runWithTenant({ tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role }, async () =>
    (
      await db.query<Row>(
        `SELECT s.id, s.first_name, s.last_name, s."position", a.status
           FROM staff_members s
           LEFT JOIN attendance a ON a.staff_id = s.id AND a.date = $1
          WHERE s.is_active = true
          ORDER BY s.first_name, s.last_name`,
        [today],
      )
    ).rows,
  );

  return (
    <>
      <PageHeader title="Présence" subtitle="Pointage de l’équipe au jour le jour." />
      <PresenceManager rows={rows} canWrite={canWrite} today={today} />
    </>
  );
}
