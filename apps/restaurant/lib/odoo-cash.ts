// Client for the Feuille de Caisse data stored in Odoo (epictete_feuille_caisse
// addon). Reuses the same Odoo host + shared secret as the website content sync.
// The backoffice cash-sheet routes call these instead of Postgres.

const ODOO_URL = process.env.ODOO_WEBSITE_URL;
const ODOO_SECRET = process.env.ODOO_WEBSITE_SECRET;

type Json = Record<string, unknown>;

async function odooFetch(path: string, init?: RequestInit): Promise<Json> {
  if (!ODOO_URL || !ODOO_SECRET) {
    throw new Error('Odoo cash store not configured (ODOO_WEBSITE_URL / ODOO_WEBSITE_SECRET)');
  }
  const res = await fetch(`${ODOO_URL.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: {
      'X-Epictete-Secret': ODOO_SECRET,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Odoo responded ${res.status}`);
  const data = (await res.json()) as Json;
  if (data.ok === false) throw new Error(String(data.error || 'odoo error'));
  return data;
}

// ── Cash sheets ─────────────────────────────────────────────────────────────
export async function odooGetSheet(date: string): Promise<Json | null> {
  const data = await odooFetch(`/epictete/cash/sheet?date=${encodeURIComponent(date)}`);
  return (data.sheet as Json | null) ?? null;
}

export async function odooUpsertSheet(body: Json): Promise<Json> {
  const data = await odooFetch('/epictete/cash/sheet', { method: 'POST', body: JSON.stringify(body) });
  return data.sheet as Json;
}

// ── Daily entries ───────────────────────────────────────────────────────────
export async function odooGetEntry(date: string): Promise<Json | null> {
  const data = await odooFetch(`/epictete/cash/entry?date=${encodeURIComponent(date)}`);
  return (data.entry as Json | null) ?? null;
}

export async function odooGetEntriesMonth(month: string): Promise<Json[]> {
  const data = await odooFetch(`/epictete/cash/entry?month=${encodeURIComponent(month)}`);
  return (data.entries as Json[] | undefined) ?? [];
}

export async function odooUpsertEntry(body: Json): Promise<Json> {
  const data = await odooFetch('/epictete/cash/entry', { method: 'POST', body: JSON.stringify(body) });
  return data.entry as Json;
}
