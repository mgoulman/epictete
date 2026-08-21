import { db } from "@/lib/db";
import { AdminConsole, type TenantRow } from "./AdminConsole";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const { rows } = await db.unsafeQuery<TenantRow>("SELECT * FROM plt_tenants_overview()");
  return <AdminConsole initialTenants={rows} />;
}
