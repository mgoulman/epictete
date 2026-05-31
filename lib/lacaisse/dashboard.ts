// Thin client for the LaCaisse backoffice dashboard API (apiv2.lacaisse.ma).
// Reverse-engineered from backoffice.lacaisse.ma — the same API the website uses
// to render the "Tableau de bord" KPIs (CA réalisé, couverts, transactions, …).

const AUTH_URL = 'https://apiv2.lacaisse.ma/api/v1/auth';
const API_BASE = 'https://apiv2.lacaisse.ma';
const LEGACY_BASE = 'https://api-legacy.lacaisse.ma';

export interface AuthResult {
  bearer: string;
  licence: string;
  accountCaisseId: number;
}

export interface CaisseInfo {
  id_caisse: number;
  nom_societe: string;
  ville: string;
  email: string;
  token_api_caisse: string;
}

export interface Range {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface DailyKpis {
  date: string;            // YYYY-MM-DD
  revenue: number;
}

export interface RangeKpis {
  caRealise: number;       // total revenue, matches dashboard "CA réalisé"
  caAnnule: number;
  benefice: number;
  couverts: number;        // total covers
  transactions: number;    // number_vente
  avgTicket: number | null;
  bestDay: string | null;
  bestDayAmount: number | null;
}

const toDDMMYY = (iso: string, sep = '/') => {
  // iso = YYYY-MM-DD
  const [y, m, d] = iso.split('-');
  return `${d}${sep}${m}${sep}${y.slice(2)}`;
};

export async function authenticate(login: string, password: string): Promise<AuthResult> {
  const r = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  if (!r.ok) throw new Error(`LaCaisse auth failed: ${r.status}`);
  const j = await r.json();
  if (!j.token || !j.licence || !j.id_account_caisse) {
    throw new Error('LaCaisse auth response missing fields');
  }
  return { bearer: j.token, licence: j.licence, accountCaisseId: j.id_account_caisse };
}

async function callDashboard<T = unknown>(
  path: string,
  auth: AuthResult,
  caisseId: number,
  body: unknown,
): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${auth.bearer}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-identifier-val': String(caisseId),
      'x-identifier-account': String(auth.accountCaisseId),
      'Origin': 'https://backoffice.lacaisse.ma',
      'Referer': 'https://backoffice.lacaisse.ma/',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`LaCaisse ${path} failed: ${r.status}`);
  return r.json();
}

export async function listCaisses(auth: AuthResult, email: string): Promise<CaisseInfo[]> {
  const r = await fetch(`${API_BASE}/api/v1/caisse/listCaisse`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${auth.bearer}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  if (!r.ok) throw new Error(`listCaisse failed: ${r.status}`);
  const j = await r.json();
  return j.data || [];
}

export async function findCaisseByName(auth: AuthResult, email: string, name: string): Promise<CaisseInfo | null> {
  const list = await listCaisses(auth, email);
  const target = name.toLowerCase();
  return list.find(c => (c.nom_societe || '').toLowerCase().includes(target)) || null;
}

interface ActiviteResponse {
  data?: {
    moyennesnumber_affaire?: { number_affaire?: number };
    moyennesca_annule?: { ca_annule?: number };
    moyennesbenefice_jour?: { benefice_jour?: number };
  };
}

interface MoyenneResponse {
  data?: {
    moyennes2?: {
      couvert?: number;
      number_vente?: number;
      number_moyen?: number | null;
      meilleur_jour?: string | null;
      meilleur_jour_prix?: number | null;
    };
    moyennesbenefice_realise?: { benefice_realise?: number };
  };
}

interface JournalierResponse {
  data?: {
    graph?: {
      dates?: string[];
      ventes?: number[];
    };
  };
}

export async function getRangeKpis(auth: AuthResult, caisseId: number, range: Range): Promise<RangeKpis> {
  const info = {
    dateDebut: toDDMMYY(range.startDate),
    dateFin: toDDMMYY(range.endDate),
    listcaisses: null,
  };
  const [act, moy] = await Promise.all([
    callDashboard<ActiviteResponse>(`/api/v1/activite/${caisseId}`, auth, caisseId, { info }),
    callDashboard<MoyenneResponse>(`/api/v1/activitemoyenne/${caisseId}`, auth, caisseId, { info }),
  ]);
  const m = moy.data?.moyennes2 || {};
  return {
    caRealise: Number(act.data?.moyennesnumber_affaire?.number_affaire) || 0,
    caAnnule: Number(act.data?.moyennesca_annule?.ca_annule) || 0,
    benefice: Number(moy.data?.moyennesbenefice_realise?.benefice_realise) || 0,
    couverts: Number(m.couvert) || 0,
    transactions: Number(m.number_vente) || 0,
    avgTicket: m.number_moyen != null ? Number(m.number_moyen) : null,
    bestDay: m.meilleur_jour ? m.meilleur_jour.slice(0, 10) : null,
    bestDayAmount: m.meilleur_jour_prix != null ? Number(m.meilleur_jour_prix) : null,
  };
}

export async function getDailyRevenue(auth: AuthResult, caisseId: number, range: Range): Promise<DailyKpis[]> {
  // /activitejournalier wants DD-MM-YY, not DD/MM/YY
  const info = {
    dateDebut: toDDMMYY(range.startDate, '-'),
    dateFin: toDDMMYY(range.endDate, '-'),
    listcaisses: '',
  };
  const j = await callDashboard<JournalierResponse>(`/api/v1/activitejournalier/${caisseId}`, auth, caisseId, { info });
  const dates = j.data?.graph?.dates || [];
  const ventes = j.data?.graph?.ventes || [];
  return dates.map((d, i) => ({ date: d, revenue: Number(ventes[i]) || 0 }));
}

export interface DashboardConfig {
  login: string;
  password: string;
  // caisseName is used to auto-discover the right id_caisse via listCaisse.
  // Falls back to LACAISSE_CAISSE_ID env var if name lookup misses.
  caisseName?: string;
  caisseId?: number;
}

export function getDashboardConfig(): DashboardConfig {
  return {
    login: process.env.LACAISSE_LOGIN || '',
    password: process.env.LACAISSE_PASSWORD || '',
    caisseName: process.env.LACAISSE_CAISSE_NAME || 'EPICTETE',
    caisseId: process.env.LACAISSE_CAISSE_ID ? Number(process.env.LACAISSE_CAISSE_ID) : undefined,
  };
}

// ── Line-item fetch (legacy export_excel.php) ────────────────────────────────
// Note: the dashboard endpoints don't expose per-ticket line items, only KPIs.
// We hit the legacy Excel export and parse it. `Prix de vente` is the LINE total
// already (unit × qty), so we store it as-is and never re-multiply.
export interface LineItem {
  ticket_number: string | null;
  family: string | null;
  category: string | null;
  product_name: string;
  sub_product: string | null;
  quantity: number;
  catalog_price: number;
  selling_price: number;          // line total — already unit × qty
  tax_rate: number;
  profit: number;
  dine_in: boolean;
  sale_date: string | null;       // YYYY-MM-DD
  sale_time: string | null;       // HH:MM:SS
  lacaisse_order_id: string | null;
}

const excelDateToISO = (n: number): string | null => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  // Excel epoch = 1900-01-01 (with the 1900 leap-year bug); 25569 = days from 1900 to 1970
  const ms = (n - 25569) * 86400 * 1000;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const cleanTime = (t: unknown): string | null => {
  if (t == null) return null;
  const s = String(t).trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  return `${m[1].padStart(2, '0')}:${m[2]}:${(m[3] || '00').padStart(2, '0')}`;
};

export async function fetchLineItems(
  auth: AuthResult,
  caisseId: number,
  range: Range,
): Promise<LineItem[]> {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${m}/${d}/${y}`; // legacy endpoint expects MM/DD/YYYY
  };
  const url = new URL(`${LEGACY_BASE}/export_excel.php`);
  url.searchParams.set('caisse', String(caisseId));
  url.searchParams.set('startDate', fmt(range.startDate));
  url.searchParams.set('endDate', fmt(range.endDate));
  url.searchParams.set('token_api', auth.licence);
  url.searchParams.set('idcaisselist', String(caisseId));
  const r = await fetch(url.toString());
  if (!r.ok) throw new Error(`export_excel failed: ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const num = (v: unknown, d = 0): number => {
    if (v == null) return d;
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : d;
  };
  // The export is UTF-8 but the XLSX library mis-decodes shared strings as Latin-1
  // when they originate from LaCaisse, so "Pâté" → "PÃ¢tÃ©". Reverse the damage.
  const fixMojibake = (s: string): string => {
    if (!/[ÃÂ]/.test(s)) return s;
    try {
      return Buffer.from(s, 'latin1').toString('utf8');
    } catch {
      return s;
    }
  };
  const str = (v: unknown): string | null => {
    if (v == null) return null;
    const s = fixMojibake(String(v)).trim();
    return s ? s : null;
  };

  return rows.map(r => {
    const dateRaw = r['Date'];
    const sale_date = typeof dateRaw === 'number'
      ? excelDateToISO(dateRaw)
      : (str(dateRaw)?.match(/^\d{4}-\d{2}-\d{2}$/) ? str(dateRaw) : null);
    return {
      ticket_number: str(r['Num ticket']),
      family: str(r['Famille']),
      category: str(r['Categorie']),
      product_name: str(r['Produit']) || 'Unknown',
      sub_product: str(r['DÃ©clinaison'] ?? r['Déclinaison']),
      quantity: num(r['QuantitÃ©'] ?? r['Quantité'], 1),
      catalog_price: num(r['Prix catalogue']),
      selling_price: num(r['Prix de vente']),
      tax_rate: num(r['TVA'], 10),
      profit: num(r['BÃ©nÃ©fice'] ?? r['Bénéfice']),
      dine_in: str(r['SurPlace']) === 'Sur place',
      sale_date,
      sale_time: cleanTime(r['Heure']),
      lacaisse_order_id: str(r['Id commande']),
    };
  });
}

export async function resolveCaisseId(auth: AuthResult, cfg: DashboardConfig): Promise<number> {
  if (cfg.caisseName) {
    const found = await findCaisseByName(auth, cfg.login, cfg.caisseName);
    if (found) return found.id_caisse;
  }
  if (cfg.caisseId) return cfg.caisseId;
  throw new Error(`Could not resolve caisse_id for "${cfg.caisseName}"`);
}
