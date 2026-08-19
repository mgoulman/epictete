import { randomBytes } from "crypto";

/** High-entropy, URL-safe, single-use invite token (~256 bits). */
export function newInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export const INVITE_ROLES = ["manager", "cashier"] as const;
export type InviteRole = (typeof INVITE_ROLES)[number];

export const ROLE_LABEL_FR: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  manager: "Manager",
  cashier: "Caissier",
};

/** Build the absolute accept URL for an invite token from the incoming request. */
export function inviteUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/invite/${token}`;
}
