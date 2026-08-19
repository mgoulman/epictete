import type { z } from "zod";

/** Run a zod schema against form values → map of {fieldPath: firstMessage}. Empty when valid. */
export function zodErrors(schema: z.ZodType, values: unknown): Record<string, string> {
  const r = schema.safeParse(values);
  if (r.success) return {};
  const out: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
