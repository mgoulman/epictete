import Link from "next/link";
import { cn } from "./cn";

type Tone = "accent" | "positive" | "warning" | "danger" | "info";

const ICON_TONE: Record<Tone, string> = {
  accent: "bg-[var(--color-accent)]/12 text-[var(--color-accent)]",
  positive: "bg-[var(--color-positive-bg)] text-[var(--color-positive)]",
  warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
  danger: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
  info: "bg-[var(--color-info-bg)] text-[var(--color-info)]",
};

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
  hint?: React.ReactNode;
  href?: string;
  /** Emphasise this as the primary (larger) tile. */
  featured?: boolean;
}

export function StatCard({
  label,
  value,
  icon,
  tone = "accent",
  hint,
  href,
  featured,
}: StatCardProps) {
  const inner = (
    <div
      className={cn(
        "h-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius)] p-5",
        "transition-colors",
        href && "hover:border-[var(--color-border-strong)] cursor-pointer",
        featured && "border-[var(--color-accent)]/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-[var(--color-muted-foreground)]">{label}</span>
        {icon && (
          <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)]", ICON_TONE[tone])}>
            {icon}
          </span>
        )}
      </div>
      <div
        className={cn(
          "mt-3 tnum font-semibold text-[var(--color-foreground)]",
          featured ? "text-3xl" : "text-2xl",
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">{hint}</div>}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
}
