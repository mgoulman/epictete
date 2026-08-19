import { db } from "@/lib/db";
import { newInviteToken } from "@/lib/invite";

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "restaurant";
}

export interface ProvisionInput {
  restaurantName: string;
  city?: string;
  ownerEmail: string;
  invitedBy?: string | null;
}

export interface ProvisionResult {
  tenantId: string;
  slug: string;
  token: string;
}

/**
 * Create a new tenant shell + default branch + an OWNER invitation. Platform-level
 * (unsafeQuery — no tenant context; the caller is a platform admin). The restaurant
 * owner accepts the returned invite link to set their password and take ownership.
 */
export async function provisionTenant(input: ProvisionInput): Promise<ProvisionResult> {
  const name = input.restaurantName.trim();
  const email = input.ownerEmail.trim().toLowerCase();

  // unique slug
  const base = slugify(name);
  let slug = base;
  for (let i = 2; ; i++) {
    const clash = await db.unsafeQuery("SELECT 1 FROM tenants WHERE slug = $1", [slug]);
    if (clash.rows.length === 0) break;
    slug = `${base}-${i}`;
  }

  const tenant = (
    await db.unsafeQuery<{ id: string }>(
      "INSERT INTO tenants (slug, name, city, status) VALUES ($1, $2, $3, 'active') RETURNING id",
      [slug, name, input.city?.trim() || null],
    )
  ).rows[0];

  await db.unsafeQuery(
    "INSERT INTO branches (tenant_id, name, is_default) VALUES ($1, $2, true)",
    [tenant.id, "Principal"],
  );

  const ownerRole = (
    await db.unsafeQuery<{ id: string }>(
      "SELECT id FROM roles WHERE name = 'owner' AND tenant_id IS NULL LIMIT 1",
    )
  ).rows[0];
  if (!ownerRole) throw new Error("Rôle 'owner' introuvable — appliquez le seed des rôles.");

  const token = newInviteToken();
  await db.unsafeQuery(
    `INSERT INTO invitations (tenant_id, email, role_id, token, invited_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [tenant.id, email, ownerRole.id, token, input.invitedBy ?? null],
  );

  return { tenantId: tenant.id, slug, token };
}
