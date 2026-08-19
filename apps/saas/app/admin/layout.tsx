import { redirect } from "next/navigation";
import { resolvePlatformAdmin } from "@/lib/platform";
import { AdminBar } from "./AdminBar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await resolvePlatformAdmin();
  if (!admin) redirect("/login");
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <AdminBar name={admin.name} />
      <main className="mx-auto max-w-5xl px-4 lg:px-8 py-8">{children}</main>
    </div>
  );
}
