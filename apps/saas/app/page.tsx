import { redirect } from "next/navigation";
import { getSessionView } from "@/lib/session";
import { resolvePlatformAdmin } from "@/lib/platform";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSessionView();
  if (session) redirect("/dashboard");
  const admin = await resolvePlatformAdmin();
  redirect(admin ? "/admin" : "/login");
}
