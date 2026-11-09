import { NextRequest, NextResponse } from 'next/server';
import { enforce, getCurrentUserId } from '@/lib/auth/supabase-server';
import { createAuditLog } from '@/lib/auth/audit';
import { odooGetSheet, odooUpsertSheet } from '@/lib/odoo-cash';

// The Feuille de Caisse is stored in Odoo (epictete_feuille_caisse addon). Odoo
// computes the totals; this route is a thin authenticated proxy.

function parseCashNumber(value: unknown) {
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

// Re-derive the two cash totals from the stored sheet so the client always gets
// consistent values regardless of how an older row was stored.
function normalizeStoredCashSheet<T extends Record<string, unknown>>(sheet: T | null): T | null {
  if (!sheet) return sheet;
  const totalCA = parseCashNumber(sheet.total_ca);
  const totalCB = parseCashNumber(sheet.total_cb);
  const glovoEspece = parseCashNumber(sheet.glovo_ttc_espece);
  const glovoOnline = parseCashNumber(sheet.glovo_ttc_online);
  const especeSources = sourcesTotal(sheet.payment_sources, true);
  const deduitSources = sourcesTotal(sheet.payment_sources, false);
  const caisseEspeces = Math.max(0, totalCA - totalCB - glovoEspece - glovoOnline - deduitSources);
  const totalEspeces = Math.max(0, totalCA - totalCB - glovoOnline - deduitSources) + especeSources;
  return { ...sheet, total_especes_caisse: caisseEspeces, total_especes: totalEspeces };
}

// GET /api/reports/cash-sheets?date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const denied = await enforce('reports.read'); if (denied) return denied;
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });
    const sheet = await odooGetSheet(date);
    return NextResponse.json({ sheet: normalizeStoredCashSheet(sheet) });
  } catch (error) {
    console.error('Cash sheet GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// POST — upsert the sheet (Odoo computes the totals)
export async function POST(request: NextRequest) {
  const denied = await enforce('reports.write'); if (denied) return denied;
  try {
    const body = await request.json();
    if (!body.entry_date) return NextResponse.json({ error: 'entry_date required' }, { status: 400 });

    const saved = await odooUpsertSheet(body);

    await createAuditLog({
      userId: await getCurrentUserId(),
      action: 'upsert',
      resourceType: 'cash_sheet',
      resourceId: String(body.entry_date),
      newValues: {
        entry_date: body.entry_date,
        total_ca: saved?.total_ca,
        total_depense: saved?.total_depense,
      },
    });

    return NextResponse.json({ success: true, sheet: saved });
  } catch (error) {
    console.error('Cash sheet POST error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
