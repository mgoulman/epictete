// Central error reporting shim. Console-structured for now; Sentry-ready (wire
// captureException here when the saas Sentry project lands — D8: includeLocalVariables
// OFF, PII scrub, tenant_id tag). Never throws.

interface ReportContext {
  where?: string;
  level?: "error" | "warning" | "info";
  extra?: Record<string, unknown>;
}

export function reportError(error: unknown, ctx: ReportContext = {}): void {
  const { where = "app", level = "error", extra } = ctx;
  const msg = error instanceof Error ? error.message : String(error);
  const line = `[${level}] ${where}: ${msg}`;
  try {
    if (level === "warning") console.warn(line, extra ?? "");
    else console.error(line, extra ?? "", error instanceof Error ? error.stack : "");
  } catch {
    /* never throw from the reporter */
  }
  // TODO(prod): Sentry.captureException(error, { level, tags: { where }, extra });
}
