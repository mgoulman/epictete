/** The session shape the client shell needs (safe to serialize to the browser). */
export interface SessionView {
  user: { id: string; name: string; email: string };
  tenant: { name: string; slug: string; status: string };
  branch: { name: string } | null;
  role: string | null;
  perms: string[];
}
