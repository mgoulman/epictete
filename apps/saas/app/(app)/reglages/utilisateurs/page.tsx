import { redirect } from "next/navigation";
import { runWithTenant } from "@epictete/core/db";
import { db } from "@/lib/db";
import { resolveTenant } from "@/lib/tenant";
import { getSaasSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { TeamManager, type Member, type Invite } from "./TeamManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const [ctx, session] = await Promise.all([resolveTenant(), getSaasSession()]);
  if (!ctx) redirect("/login");

  const canManage =
    session?.role === "owner" || session?.role === "admin" || (session?.perms.includes("users.manage") ?? false);

  const data = await runWithTenant({ tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role }, async () => {
    const members = (
      await db.query<Member>(
        `SELECT u.id AS user_id, u.email,
                COALESCE(NULLIF(p.full_name,''), u.email) AS name,
                r.name AS role, m.is_active
           FROM memberships m
           JOIN users u ON u.id = m.user_id
           LEFT JOIN profiles p ON p.id = u.id
           LEFT JOIN roles r ON r.id = m.role_id
          ORDER BY (r.name = 'owner') DESC, m.created_at`,
      )
    ).rows;
    const invites = (
      await db.query<Invite>(
        `SELECT i.id, i.email, r.name AS role, i.expires_at, (i.expires_at < now()) AS expired
           FROM invitations i
           LEFT JOIN roles r ON r.id = i.role_id
          WHERE i.status = 'pending'
          ORDER BY i.created_at DESC`,
      )
    ).rows;
    return { members, invites };
  });

  return (
    <>
      <PageHeader title="Utilisateurs" subtitle="Gérez qui accède à l’espace de votre restaurant." />
      <TeamManager
        initialMembers={data.members}
        initialInvites={data.invites}
        canManage={canManage}
        currentUserId={ctx.userId ?? ""}
      />
    </>
  );
}
