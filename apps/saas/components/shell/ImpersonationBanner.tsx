"use client";

import { useRouter } from "next/navigation";
import { Eye, X } from "lucide-react";

export function ImpersonationBanner({ tenantName }: { tenantName: string }) {
  const router = useRouter();
  async function stop() {
    await fetch("/api/admin/impersonate", { method: "DELETE" });
    router.push("/admin");
    router.refresh();
  }
  return (
    <div className="flex items-center justify-center gap-3 bg-[var(--color-warning)] text-white text-sm px-4 py-2">
      <Eye className="h-4 w-4" />
      <span>
        Mode support — vous consultez <span className="font-semibold">{tenantName}</span> en tant qu’administrateur.
      </span>
      <button onClick={stop} className="inline-flex items-center gap-1 font-medium underline hover:no-underline">
        <X className="h-3.5 w-3.5" /> Quitter
      </button>
    </div>
  );
}
