// Shared Feuille de Caisse model + totals — used by the client form and the API so
// the displayed and persisted figures always agree. Formula mirrors the (corrected)
// restaurant logic: Espèce encaissements ADD to Total Espèces only; Déduit are ignored.

export interface PaymentSource {
  name: string;
  amount: number;
  counts_as_cash: boolean; // true = "Espèce" (adds to Total Espèces), false = "Déduit" (ignored)
}

export interface DepenseItem {
  label: string;
  amount: number;
}

export interface CaisseData {
  entry_date: string;
  total_ca: number;
  total_cb: number;
  glovo_ttc_espece: number;
  glovo_ttc_online: number;
  payment_sources: PaymentSource[];
  depenses: DepenseItem[];
  manager_name: string;
  especes_note: string;
}

export interface CaisseTotals {
  especeSources: number;
  caisseEspeces: number;
  totalEspeces: number;
  totalDepense: number;
  resteEspeces: number;
}

export function num(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function computeTotals(d: {
  total_ca: unknown;
  total_cb: unknown;
  glovo_ttc_espece: unknown;
  glovo_ttc_online: unknown;
  payment_sources?: PaymentSource[];
  depenses?: DepenseItem[];
}): CaisseTotals {
  const ca = num(d.total_ca);
  const cb = num(d.total_cb);
  const gEsp = num(d.glovo_ttc_espece);
  const gOnline = num(d.glovo_ttc_online);
  const especeSources = (d.payment_sources || [])
    .filter((s) => s.counts_as_cash)
    .reduce((s, x) => s + num(x.amount), 0);
  const totalDepense = (d.depenses || []).reduce((s, x) => s + num(x.amount), 0);

  const caisseEspeces = Math.max(0, ca - cb - gEsp - gOnline);
  const totalEspeces = Math.max(0, ca - cb - gOnline) + especeSources;
  const resteEspeces = totalEspeces - totalDepense;
  return { especeSources, caisseEspeces, totalEspeces, totalDepense, resteEspeces };
}

export function emptyCaisse(entry_date: string): CaisseData {
  return {
    entry_date,
    total_ca: 0,
    total_cb: 0,
    glovo_ttc_espece: 0,
    glovo_ttc_online: 0,
    payment_sources: [],
    depenses: [],
    manager_name: "",
    especes_note: "",
  };
}
