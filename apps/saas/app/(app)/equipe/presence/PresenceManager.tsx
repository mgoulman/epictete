"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/ToastProvider";
import { fetchJson, ApiError } from "@/lib/api/fetch-json";
import { dateFR } from "@/lib/format";

export interface Row { id: string; first_name: string; last_name: string; position: string | null; status: string | null }

const OPTIONS = [
  { value: "present", label: "Présent", active: "bg-[var(--color-positive)] text-white" },
  { value: "late", label: "Retard", active: "bg-[var(--color-warning)] text-white" },
  { value: "absent", label: "Absent", active: "bg-[var(--color-danger)] text-white" },
];

export function PresenceManager({ rows, canWrite, today }: { rows: Row[]; canWrite: boolean; today: string }) {
  const router = useRouter();
  const toast = useToast();
  const [local, setLocal] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((r) => [r.id, r.status ?? ""])));
  const [busy, setBusy] = useState<string | null>(null);

  async function mark(staffId: string, status: string) {
    const prev = local[staffId];
    setLocal((l) => ({ ...l, [staffId]: status })); // optimistic
    setBusy(staffId);
    try {
      await fetchJson("/api/attendance", { method: "POST", json: { staff_id: staffId, status } });
    } catch (err) {
      setLocal((l) => ({ ...l, [staffId]: prev })); // rollback
      toast.error(err instanceof ApiError ? err.message : "Échec.");
    } finally {
      setBusy(null);
      router.refresh();
    }
  }

  const present = Object.values(local).filter((s) => s === "present").length;

  return (
    <div className="space-y-4">
      <div className="text-sm text-[var(--color-muted-foreground)] capitalize">
        {dateFR(today)} · <span className="font-semibold text-[var(--color-foreground)]">{present} / {rows.length}</span> présents
      </div>
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 rounded-[var(--radius)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-card)]">
          <CalendarClock className="h-6 w-6 text-[var(--color-muted-foreground)]" />
          <div className="text-sm text-[var(--color-muted-foreground)]">Ajoutez des employés dans Personnel pour pointer la présence.</div>
        </div>
      ) : (
        <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <div className="font-medium text-[var(--color-foreground)]">{r.first_name} {r.last_name}</div>
                {r.position && <div className="text-xs text-[var(--color-muted-foreground)]">{r.position}</div>}
              </div>
              <div className="flex rounded-[var(--radius-sm)] border border-[var(--color-border)] overflow-hidden text-xs font-semibold">
                {OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    disabled={!canWrite || busy === r.id}
                    onClick={() => mark(r.id, o.value)}
                    className={cn("px-3 py-1.5 transition-colors disabled:opacity-60", local[r.id] === o.value ? o.active : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)]")}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {!canWrite && <p className="text-sm text-[var(--color-muted-foreground)]">Vous n’avez pas les droits pour modifier la présence.</p>}
    </div>
  );
}
