import { forwardRef } from "react";
import { cn } from "./cn";

const controlBase =
  "w-full h-10 px-3 rounded-[var(--radius-sm)] bg-[var(--color-background)] text-[var(--color-foreground)] " +
  "border border-[var(--color-border)] placeholder:text-[var(--color-muted-foreground)] transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-[var(--color-accent)] disabled:opacity-50";
const errorRing = "border-[var(--color-danger)] focus:ring-[var(--color-danger)] focus:border-[var(--color-danger)]";

/** Label + control + error/hint + required marker. Wrap any control. */
export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--color-foreground)] mb-1.5">
          {label}
          {required && <span className="text-[var(--color-danger)]"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{hint}</p>
      ) : null}
    </div>
  );
}

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function TextInput({ className, invalid, ...props }, ref) {
    return <input ref={ref} className={cn(controlBase, invalid && errorRing, className)} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, ...props }, ref) {
    return <textarea ref={ref} className={cn(controlBase, "h-auto py-2 min-h-[80px]", invalid && errorRing, className)} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ className, invalid, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(controlBase, "cursor-pointer", invalid && errorRing, className)} {...props}>
        {children}
      </select>
    );
  },
);

/** Right-aligned tabular money input with a DH suffix. Value is a free-text string. */
export const MoneyInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function MoneyInput({ className, invalid, ...props }, ref) {
    return (
      <div className="relative">
        <input
          ref={ref}
          inputMode="decimal"
          className={cn(controlBase, "pr-10 text-right tnum", invalid && errorRing, className)}
          {...props}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-muted-foreground)]">
          DH
        </span>
      </div>
    );
  },
);

export function Checkbox({ label, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: React.ReactNode }) {
  return (
    <label className={cn("flex items-start gap-2.5 cursor-pointer", className)}>
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" {...props} />
      {label && <span className="text-sm text-[var(--color-foreground)]">{label}</span>}
    </label>
  );
}
