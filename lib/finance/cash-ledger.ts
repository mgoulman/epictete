// Cumulative cash balance ("solde espèces cumulé" / report de caisse).
//
// Each Feuille de Caisse is computed per-day and its day-net (`total_especes −
// total_depense`, i.e. "Reste en espèces") can be negative when a day's cash
// outflows exceed its inflows. The drawer physically carries cash forward from
// every previous day, so the meaningful figure is the RUNNING balance: a day
// just draws it down, it only turns negative if cumulative cash-out ever exceeds
// cumulative cash-in.
//
// The ledger is ANCHORED to a real drawer count rather than summing all history:
// LEDGER_ANCHOR_BALANCE is the cash physically in the drawer at the CLOSE of
// LEDGER_ANCHOR_DATE (that figure already includes the anchor day itself). Only
// days AFTER the anchor date add their movement on top; the anchor day shows the
// anchor balance as its closing (never re-added), and days before it are excluded.
// To re-anchor (new physical count), change these two values in one place.
//
// Formulas below are copied verbatim from app/api/reports/cash-sheets/route.ts so
// the day-net here is byte-for-byte the same as the "Reste en espèces" the sheet
// already shows — no drift.

/** Anchor day — the day of the physical count. ISO YYYY-MM-DD. */
export const LEDGER_ANCHOR_DATE = '2026-09-12';
/** Cash in the drawer at the CLOSE of LEDGER_ANCHOR_DATE (MAD) — includes that day. */
export const LEDGER_ANCHOR_BALANCE = 4177.21;

export function parseCashNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const compact = value.trim().replace(/[\s ]/g, '').replace(/[^\d,.-]/g, '');
  if (!compact) return 0;
  const lastComma = compact.lastIndexOf(',');
  const lastDot = compact.lastIndexOf('.');
  const normalized = lastComma > -1 && lastDot > -1
    ? lastComma > lastDot
      ? compact.replace(/\./g, '').replace(',', '.')
      : compact.replace(/,/g, '')
    : compact.replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sourcesTotal(sources: unknown, wantCash: boolean): number {
  if (!Array.isArray(sources)) return 0;
  return sources
    .filter((s): s is { amount: unknown; counts_as_cash?: unknown } => !!s && typeof s === 'object')
    .filter(s => !!s.counts_as_cash === wantCash)
    .reduce((sum, s) => sum + parseCashNumber(s.amount), 0);
}

function customColumnsDepense(columns: unknown): number {
  if (!Array.isArray(columns)) return 0;
  return columns
    .filter((c): c is { items?: unknown; count_as_depense?: unknown } => !!c && typeof c === 'object')
    .filter(c => c.count_as_depense)
    .reduce((sum, c) => sum + (Array.isArray(c.items)
      ? c.items.reduce((s: number, i: { amount: unknown }) => s + parseCashNumber(i?.amount), 0)
      : 0), 0);
}

const FIXED_DEPENSE_KEYS = ['paid_items', 'unpaid_items', 'paid_outside_items'] as const;
function fixedColumnsDepense(sheet: Record<string, unknown>): number {
  const flags = (sheet.column_flags && typeof sheet.column_flags === 'object')
    ? sheet.column_flags as Record<string, { count_as_depense?: unknown; hidden?: unknown }>
    : {};
  return FIXED_DEPENSE_KEYS.reduce((sum, key) => {
    const f = flags[key] || {};
    const counts = f.count_as_depense ?? (key === 'paid_items');
    if (!counts || f.hidden) return sum;
    const items = sheet[key];
    if (!Array.isArray(items)) return sum;
    return sum + items.reduce((s: number, i: { amount: unknown }) => s + parseCashNumber(i?.amount), 0);
  }, 0);
}

/** The day's net cash movement (= "Reste en espèces" = total_especes − total_depense). Can be negative. */
export function sheetDayNet(sheet: Record<string, unknown>): number {
  const totalCA = parseCashNumber(sheet.total_ca);
  const totalCB = parseCashNumber(sheet.total_cb);
  const glovoOnline = parseCashNumber(sheet.glovo_ttc_online);
  const especeSources = sourcesTotal(sheet.payment_sources, true);
  const deduitSources = sourcesTotal(sheet.payment_sources, false);
  const totalEspeces = Math.max(0, totalCA - totalCB - glovoOnline - deduitSources) + especeSources;
  const totalDepense = fixedColumnsDepense(sheet) + customColumnsDepense(sheet.custom_columns);
  return totalEspeces - totalDepense;
}

export interface LedgerRow {
  date: string;
  dayNet: number;
  opening: number;
  closing: number;
}

/** Running balance over date-ascending sheets, starting from `start` (default 0). */
export function computeRunningBalance(
  sheetsAsc: Array<Record<string, unknown>>,
  start = 0,
): LedgerRow[] {
  let balance = start;
  return sheetsAsc.map((s) => {
    const dayNet = sheetDayNet(s);
    const opening = balance;
    const closing = balance + dayNet;
    balance = closing;
    return { date: String(s.entry_date), dayNet, opening, closing };
  });
}

/**
 * Anchored running balance. `anchorBalance` is the drawer's cash at the CLOSE of
 * `anchorDate` (already includes that day), so:
 *  - days before the anchor are excluded,
 *  - the anchor day itself closes at exactly `anchorBalance` (never re-added):
 *    its opening is back-derived as anchorBalance − dayNet,
 *  - every day after the anchor builds on `anchorBalance`.
 */
export function computeAnchoredBalance(
  sheetsAsc: Array<Record<string, unknown>>,
  anchorDate: string,
  anchorBalance: number,
): LedgerRow[] {
  const rows: LedgerRow[] = [];
  let balance = anchorBalance; // closing as of end of anchorDate
  for (const s of sheetsAsc) {
    const date = String(s.entry_date);
    if (date < anchorDate) continue; // pre-anchor days excluded
    const dayNet = sheetDayNet(s);
    if (date === anchorDate) {
      // Anchor day: closing is pinned to the physical count; net already baked in.
      rows.push({ date, dayNet, opening: anchorBalance - dayNet, closing: anchorBalance });
    } else {
      const opening = balance;
      const closing = balance + dayNet;
      balance = closing;
      rows.push({ date, dayNet, opening, closing });
    }
  }
  return rows;
}
