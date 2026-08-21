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
  const base = slugify(name);

  // roles is a global (no-RLS) table
  const ownerRole = (
    await db.unsafeQuery<{ id: string }>(
      "SELECT id FROM roles WHERE name = 'owner' AND tenant_id IS NULL LIMIT 1",
    )
  ).rows[0];
  if (!ownerRole) throw new Error("Rôle 'owner' introuvable — appliquez le seed des rôles.");

  const token = newInviteToken();
  // Creating a brand-new tenant has no context to run in → SECURITY DEFINER function
  // (finds a unique slug + creates tenant + default branch + owner invite atomically).
  const { rows } = await db.unsafeQuery<{ tenant_id: string; slug: string }>(
    "SELECT tenant_id, slug FROM plt_provision($1, $2, $3, $4, $5, $6, $7)",
    [name, base, input.city?.trim() || null, email, ownerRole.id, token, input.invitedBy ?? null],
  );

  return { tenantId: rows[0].tenant_id, slug: rows[0].slug, token };
}
