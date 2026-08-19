import { db } from "@/lib/db";
import { newInviteToken } from "@/lib/invite";

/** Create a one-time password-reset token for a user (platform-level). Returns the token. */
export async function createResetForUser(userId: string, createdBy: string | null): Promise<string> {
  const token = newInviteToken();
  await db.unsafeQuery(
    "INSERT INTO password_resets (user_id, token, created_by) VALUES ($1, $2, $3)",
    [userId, token, createdBy],
  );
  return token;
}

export function resetUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/reset/${token}`;
}
