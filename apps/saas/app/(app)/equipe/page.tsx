import { redirect } from "next/navigation";
import { runWithTenant } from "@epictete/core/db";
import { db } from "@/lib/db";
import { resolveTenant } from "@/lib/tenant";
import { getSaasSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { StaffManager, type Staff } from "./StaffManager";

export const dynamic = "force-dynamic";

export default async function EquipePage() {
  const [ctx, session] = await Promise.all([resolveTenant(), getSaasSession()]);
  if (!ctx) redirect("/login");
  const canWrite = session?.role === "owner" || session?.role === "admin" || (session?.perms.includes("personnel.write") ?? false);

  const staff = await runWithTenant({ tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role }, async () =>
    (
      await db.query<Staff>(
        `SELECT id, first_name, last_name, "position", phone FROM staff_members WHERE is_active = true ORDER BY first_name, last_name`,
      )
    ).rows,
  );

  return (
    <>
      <PageHeader title="Personnel" subtitle="Votre équipe et ses informations." />
      <StaffManager staff={staff} canWrite={canWrite} />
    </>
  );
}
