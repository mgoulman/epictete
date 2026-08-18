import { cn } from "./cn";

type Tone = "neutral" | "positive" | "warning" | "danger" | "info" | "accent";

const TONES: Record<Tone, string> = {
  neutral:
    "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] border-[var(--color-border)]",
  positive: "bg-[var(--color-positive-bg)] text-[var(--color-positive)] border-transparent",
  warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-transparent",
  danger: "bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-transparent",
  info: "bg-[var(--color-info-bg)] text-[var(--color-info)] border-transparent",
  accent:
    "bg-[var(--color-accent)]/12 text-[var(--color-accent)] border-transparent",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-sm)] border px-2 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
