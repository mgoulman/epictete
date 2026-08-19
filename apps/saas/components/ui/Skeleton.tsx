import { cn } from "./cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

/** KPI-tile grid skeleton (dashboard). */
export function SkeletonTiles({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-card)] p-5">
          <div className="flex items-start justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-9 rounded-[var(--radius-sm)]" />
          </div>
          <Skeleton className="h-8 w-32 mt-4" />
          <Skeleton className="h-3 w-40 mt-2" />
        </div>
      ))}
    </div>
  );
}

/** Table skeleton (list screens). */
export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
      <div className="border-b border-[var(--color-border)] px-4 py-3 flex gap-6">
        {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-4 flex-1" />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="border-b border-[var(--color-border)] last:border-0 px-4 py-3.5 flex gap-6">
          {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-4 flex-1" />)}
        </div>
      ))}
    </div>
  );
}

/** Form skeleton (settings/forms). */
export function SkeletonForm({ fields = 5 }: { fields?: number }) {
  return (
    <div className="max-w-2xl space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-3.5 w-28 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

export function SkeletonHeader() {
  return (
    <div className="mb-6">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64 mt-2" />
    </div>
  );
}
