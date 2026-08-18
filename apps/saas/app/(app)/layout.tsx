import { redirect } from "next/navigation";
import { getSessionView } from "@/lib/session";
import { AppShell } from "@/components/shell/AppShell";

export const dynamic = "force-dynamic"; // reads the session cookie

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionView();
  if (!session) redirect("/login");
  return <AppShell session={session}>{children}</AppShell>;
}
