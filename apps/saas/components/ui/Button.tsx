import { forwardRef } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:bg-[var(--color-accent-hover)] border border-transparent",
  secondary:
    "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] hover:bg-[var(--color-muted)] border border-[var(--color-border)]",
  ghost:
    "bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-secondary)] border border-transparent",
  danger:
    "bg-[var(--color-danger)] text-white hover:opacity-90 border border-transparent",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius)] font-medium",
        "transition-colors duration-[var(--duration-fast)] focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-background)]",
        "disabled:opacity-50 disabled:pointer-events-none cursor-pointer whitespace-nowrap",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});
