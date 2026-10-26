// Pushes a reservation to the Odoo server (epictete_reservations module).
// Configured via env: ODOO_RESERVATION_URL (e.g. https://odoo.example.com/epictete/reservation)
// and ODOO_RESERVATION_SECRET (shared secret, sent as X-Epictete-Secret).

export interface OdooReservationPayload {
  web_ref: string; // the Neon row id, for dedup on the Odoo side
  name: string;
  phone: string;
  email?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  adults: number;
  children: number;
  babyChairs?: number;
  specialRequests?: string;
  source?: string;
}

export interface OdooPushResult {
  ok: boolean;
  odooId?: number;
  error?: string;
}

/** POST the reservation to Odoo, with a short retry. Never throws. */
export async function pushReservationToOdoo(
  payload: OdooReservationPayload,
  { retries = 2, timeoutMs = 7000 }: { retries?: number; timeoutMs?: number } = {},
): Promise<OdooPushResult> {
  const url = process.env.ODOO_RESERVATION_URL;
  const secret = process.env.ODOO_RESERVATION_SECRET;
  if (!url || !secret) {
    return { ok: false, error: 'ODOO_RESERVATION_URL / ODOO_RESERVATION_SECRET not configured' };
  }

  let lastErr = 'unknown';
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Epictete-Secret': secret },
        body: JSON.stringify(payload),
        signal: controller.signal,
        cache: 'no-store',
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: number; error?: string };
      if (res.ok && data.ok) return { ok: true, odooId: data.id };
      lastErr = data.error || `HTTP ${res.status}`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  return { ok: false, error: lastErr };
}
