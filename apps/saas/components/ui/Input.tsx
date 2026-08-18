import { forwardRef } from "react";
import { cn } from "./cn";

const base =
  "w-full h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-background)] text-[var(--color-foreground)] " +
  "border border-[var(--color-border)] placeholder:text-[var(--color-muted-foreground)] " +
  "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-accent)] " +
  "disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(base, className)} {...props} />;
  },
);

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-sm font-medium text-[var(--color-foreground)] mb-1.5", className)}
      {...props}
    />
  );
}
