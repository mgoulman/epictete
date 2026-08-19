"use client";

// Global toast system. Mounted once per app tree (in (app) and admin layouts).
//   const toast = useToast();
//   toast.success("Enregistré"); toast.error("Échec"); toast.warning("…"); toast.info("…");
//   const id = toast.loading("Enregistrement…"); toast.update(id, { variant:"success", message:"Fait" });
//   toast.promise(save(), { loading:"…", success:"Enregistré", error:(e)=>String(e) });

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, Loader2, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "warning" | "info" | "loading";
export interface ToastAction { label: string; onClick: () => void }
export interface ToastOptions {
  variant?: ToastVariant;
  title?: string;
  message: string;
  duration?: number;
  action?: ToastAction;
}
interface ToastRecord extends Required<Omit<ToastOptions, "action" | "title">> {
  id: string;
  title?: string;
  action?: ToastAction;
}
type ShorthandArg = string | Omit<ToastOptions, "variant">;

export interface ToastApi {
  show: (opts: ToastOptions) => string;
  success: (arg: ShorthandArg) => string;
  error: (arg: ShorthandArg) => string;
  warning: (arg: ShorthandArg) => string;
  info: (arg: ShorthandArg) => string;
  loading: (arg: ShorthandArg) => string;
  update: (id: string, patch: Partial<ToastOptions>) => void;
  dismiss: (id: string) => void;
  promise: <T>(p: Promise<T>, msgs: { loading: string; success: string | ((v: T) => string); error: string | ((e: unknown) => string) }) => Promise<T>;
}

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 3000, info: 4000, warning: 5000, error: 6000, loading: 0,
};
const MAX_VISIBLE = 4;
const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

let counter = 0;
const nextId = () => `t${++counter}_${Math.round(performance.now())}`;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const tm = timers.current.get(id);
    if (tm) { clearTimeout(tm); timers.current.delete(id); }
  }, []);
  const dismiss = useCallback((id: string) => {
    clearTimer(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, [clearTimer]);
  const arm = useCallback((id: string, duration: number) => {
    clearTimer(id);
    if (duration > 0) timers.current.set(id, setTimeout(() => dismiss(id), duration));
  }, [clearTimer, dismiss]);

  const show = useCallback((opts: ToastOptions): string => {
    const variant = opts.variant ?? "info";
    const duration = opts.duration ?? DEFAULT_DURATION[variant];
    const id = nextId();
    setToasts((prev) => [...prev, { id, variant, message: opts.message, duration, title: opts.title, action: opts.action }]);
    arm(id, duration);
    return id;
  }, [arm]);

  const update = useCallback((id: string, patch: Partial<ToastOptions>) => {
    setToasts((prev) => {
      const found = prev.find((t) => t.id === id);
      if (!found) return prev;
      const variant = patch.variant ?? found.variant;
      const duration = patch.duration ?? (patch.variant ? DEFAULT_DURATION[variant] : found.duration);
      arm(id, duration);
      return prev.map((t) => t.id === id ? {
        ...t, variant, duration,
        message: patch.message ?? t.message,
        title: "title" in patch ? patch.title : t.title,
        action: "action" in patch ? patch.action : t.action,
      } : t);
    });
  }, [arm]);

  const shorthand = useCallback((variant: ToastVariant) =>
    (arg: ShorthandArg) => show(typeof arg === "string" ? { variant, message: arg } : { ...arg, variant }),
  [show]);

  const promise = useCallback(<T,>(p: Promise<T>, msgs: { loading: string; success: string | ((v: T) => string); error: string | ((e: unknown) => string) }): Promise<T> => {
    const id = show({ variant: "loading", message: msgs.loading });
    return p.then(
      (value) => { update(id, { variant: "success", message: typeof msgs.success === "function" ? msgs.success(value) : msgs.success }); return value; },
      (err) => { update(id, { variant: "error", message: typeof msgs.error === "function" ? msgs.error(err) : msgs.error }); throw err; },
    );
  }, [show, update]);

  const api = useMemo<ToastApi>(() => ({
    show,
    success: shorthand("success"), error: shorthand("error"), warning: shorthand("warning"),
    info: shorthand("info"), loading: shorthand("loading"),
    update, dismiss, promise,
  }), [show, shorthand, update, dismiss, promise]);

  const visible = toasts.slice(-MAX_VISIBLE);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[min(92vw,22rem)] pointer-events-none" role="region" aria-live="polite" aria-label="Notifications">
        {visible.map((t) => <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />)}
      </div>
    </ToastContext.Provider>
  );
}

const VARIANT: Record<ToastVariant, { icon: typeof Info; color: string }> = {
  success: { icon: CheckCircle2, color: "var(--color-positive)" },
  error: { icon: XCircle, color: "var(--color-danger)" },
  warning: { icon: AlertTriangle, color: "var(--color-warning)" },
  info: { icon: Info, color: "var(--color-info)" },
  loading: { icon: Loader2, color: "var(--color-accent)" },
};

function ToastCard({ toast, onDismiss }: { toast: ToastRecord; onDismiss: () => void }) {
  const { icon: Icon, color } = VARIANT[toast.variant];
  return (
    <div
      role={toast.variant === "error" || toast.variant === "warning" ? "alert" : "status"}
      className="toast-enter pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)] pl-4 pr-3 py-3"
    >
      <span className="absolute left-0 top-0 h-full w-1" style={{ background: color }} aria-hidden />
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${toast.variant === "loading" ? "animate-spin" : ""}`} style={{ color }} />
      <div className="min-w-0 flex-1">
        {toast.title && <p className="text-sm font-semibold text-[var(--color-foreground)] leading-tight">{toast.title}</p>}
        <p className={`text-sm break-words ${toast.title ? "text-[var(--color-muted-foreground)] mt-0.5" : "text-[var(--color-foreground)]"}`}>{toast.message}</p>
        {toast.action && (
          <button onClick={() => { toast.action!.onClick(); onDismiss(); }} className="mt-2 text-sm font-medium text-[var(--color-accent)] hover:underline">
            {toast.action.label}
          </button>
        )}
      </div>
      <button onClick={onDismiss} aria-label="Fermer" className="shrink-0 p-1 -mr-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
