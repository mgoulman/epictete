const MAD = new Intl.NumberFormat("fr-FR", {
  style: "decimal",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const MAD2 = new Intl.NumberFormat("fr-FR", {
  style: "decimal",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "1 234 DH" — integer dirhams for tiles. */
export function money(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return `${MAD.format(Math.round(v))} DH`;
}

/** "1 234,50 DH" — two decimals for the cash sheet. */
export function money2(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return `${MAD2.format(v)} DH`;
}

const DATE_FR = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function dateFR(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return DATE_FR.format(date);
}

/** Local YYYY-MM-DD (server may be UTC; good enough for the pilot). */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
