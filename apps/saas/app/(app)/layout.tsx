import { redirect } from "next/navigation";
import { getSessionView } from "@/lib/session";
import { AppShell } from "@/components/shell/AppShell";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { Suspended } from "@/components/Suspended";

export const dynamic = "force-dynamic"; // reads the session cookie

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionView();
  if (!session) redirect("/login");
  // Per-request suspension enforcement (not just at login).
  if (session.tenant.status !== "active") {
    return <Suspended tenantName={session.tenant.name} status={session.tenant.status} />;
  }
  return (
    <ToastProvider>
      <AppShell session={session}>{children}</AppShell>
    </ToastProvider>
  );
}
