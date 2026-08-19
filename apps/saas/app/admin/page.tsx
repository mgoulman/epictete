import { db } from "@/lib/db";
import { AdminConsole, type TenantRow } from "./AdminConsole";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const { rows } = await db.unsafeQuery<TenantRow>(
    `SELECT t.id, t.name, t.slug, t.city, t.status, t.created_at,
            (SELECT count(*)::int FROM memberships m WHERE m.tenant_id = t.id AND m.is_active) AS members,
            (SELECT count(*)::int FROM cash_sheets c WHERE c.tenant_id = t.id) AS cash_sheets,
            EXISTS (SELECT 1 FROM memberships m JOIN roles r ON r.id = m.role_id
                     WHERE m.tenant_id = t.id AND r.name = 'owner' AND m.is_active) AS has_owner
       FROM tenants t
      ORDER BY t.created_at DESC`,
  );
  return <AdminConsole initialTenants={rows} />;
}
