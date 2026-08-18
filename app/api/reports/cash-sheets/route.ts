import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, enforce } from '@/lib/auth/supabase-server';
import { createAuditLog } from '@/lib/auth/audit';

function parseCashNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;

  const compact = value.trim().replace(/[\s\u00a0]/g, '').replace(/[^\d,.-]/g, '');
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

function nonCashSourcesTotal(sources: unknown): number {
  if (!Array.isArray(sources)) return 0;
  return sources
    .filter((s): s is { amount: unknown; counts_as_cash?: unknown } => !!s && typeof s === 'object')
    .filter(s => !s.counts_as_cash)
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

// Fixed columns whose totals may be added to TOTAL DÉPENSE, keyed like the client.
// PAYÉ counts by default (historical behaviour); the others only when flagged.
const FIXED_DEPENSE_KEYS = ['paid_items', 'unpaid_items', 'paid_outside_items'] as const;
function fixedColumnsDepense(body: Record<string, unknown>): number {
  const flags = (body.column_flags && typeof body.column_flags === 'object')
    ? body.column_flags as Record<string, { count_as_depense?: unknown; hidden?: unknown }>
    : {};
  return FIXED_DEPENSE_KEYS.reduce((sum, key) => {
    const f = flags[key] || {};
    const counts = f.count_as_depense ?? (key === 'paid_items');
    if (!counts || f.hidden) return sum;
    const items = body[key];
    if (!Array.isArray(items)) return sum;
    return sum + items.reduce((s: number, i: { amount: unknown }) => s + parseCashNumber(i?.amount), 0);
  }, 0);
}

function normalizeStoredCashSheet<T extends Record<string, unknown>>(sheet: T | null): T | null {
  if (!sheet) return sheet;

  const totalCA = parseCashNumber(sheet.total_ca);
  const totalCB = parseCashNumber(sheet.total_cb);
  const glovoEspece = parseCashNumber(sheet.glovo_ttc_espece);
  const glovoOnline = parseCashNumber(sheet.glovo_ttc_online);
  const nonCashSources = nonCashSourcesTotal(sheet.payment_sources);

  const caisseEspeces = Math.max(0, totalCA - totalCB - glovoEspece - glovoOnline - nonCashSources);
  const totalEspeces = Math.max(0, totalCA - totalCB - glovoOnline - nonCashSources);

  return { ...sheet, total_especes_caisse: caisseEspeces, total_especes: totalEspeces };
}

// GET /api/reports/cash-sheets?date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const denied = await enforce('reports.read'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

    const { data, error } = await supabase
      .from('cash_sheets')
      .select('*')
      .eq('entry_date', date)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ sheet: normalizeStoredCashSheet(data) });
  } catch (error) {
    console.error('Cash sheet GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// POST — upsert
export async function POST(request: NextRequest) {
  const denied = await enforce('reports.write'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { data: { user } } = await supabase.auth.getUser();

    if (!body.entry_date) return NextResponse.json({ error: 'entry_date required' }, { status: 400 });

    // Calculate totals
    const paidItems = body.paid_items || [];
    const customColumns = Array.isArray(body.custom_columns) ? body.custom_columns : [];
    const paymentSources = Array.isArray(body.payment_sources) ? body.payment_sources : [];
    const customDepense = customColumnsDepense(customColumns);
    const totalDepense = fixedColumnsDepense(body) + customDepense;
    const totalCA = parseCashNumber(body.total_ca);
    const totalCB = parseCashNumber(body.total_cb);
    const glovoEspece = parseCashNumber(body.glovo_ttc_espece);
    const glovoOnline = parseCashNumber(body.glovo_ttc_online);
    const nonCashSources = nonCashSourcesTotal(paymentSources);
    const caisseEspeces = Math.max(0, totalCA - totalCB - glovoEspece - glovoOnline - nonCashSources);
    const totalEspeces = Math.max(0, totalCA - totalCB - glovoOnline - nonCashSources);
    const resteEspeces = totalEspeces - totalDepense;

    const sheet = {
      entry_date: body.entry_date,
      total_ca: totalCA,
      total_cb: totalCB,
      total_especes_caisse: caisseEspeces,
      total_especes: totalEspeces,
      glovo_ttc_espece: glovoEspece,
      glovo_ttc_online: glovoOnline,
      especes_note: body.especes_note || null,
      paid_items: paidItems,
      unpaid_items: body.unpaid_items || [],
      paid_outside_items: body.paid_outside_items || [],
      custom_columns: customColumns,
      column_flags: (body.column_flags && typeof body.column_flags === 'object') ? body.column_flags : {},
      payment_sources: paymentSources,
      total_depense: Math.round(totalDepense * 100) / 100,
      reste_especes: Math.round(resteEspeces * 100) / 100,
      manager_name: body.manager_name || null,
      visa_caisse: body.visa_caisse || null,
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      created_by: user?.id || null,
      updated_at: new Date().toISOString(),
    };

    // Upsert helper that normalizes BOTH failure modes of the db compat layer:
    // it may return { error } OR throw. We collapse both to a returned error so
    // the custom_columns fallback below can act on either.
    const upsertSheet = async (payload: Record<string, unknown>) => {
      try {
        const res = await supabase
          .from('cash_sheets')
          .upsert(payload, { onConflict: 'entry_date' })
          .select()
          .single();
        return { data: res.data, error: res.error as { message?: string } | null };
      } catch (e) {
        return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
      }
    };

    let { data, error } = await upsertSheet(sheet);

    // Graceful fallback if an optional JSONB column's migration hasn't been applied
    // yet: strip whichever column the error names and retry, so saving still works
    // (that field just won't persist until the migration runs). Bounded to the known
    // optional columns so we can't loop forever.
    const OPTIONAL_COLUMNS = ['custom_columns', 'payment_sources', 'column_flags'] as const;
    let attempts = 0;
    let payload: Record<string, unknown> = sheet;
    while (error && attempts < OPTIONAL_COLUMNS.length) {
      const missing = OPTIONAL_COLUMNS.find(col => new RegExp(col, 'i').test(error!.message || '') && col in payload);
      if (!missing) break;
      const { [missing]: _omit, ...rest } = payload;
      void _omit;
      payload = rest;
      ({ data, error } = await upsertSheet(payload));
      attempts++;
    }

    if (error) throw error;

    await createAuditLog({
      userId: (user?.id as string) || null,
      action: 'upsert',
      resourceType: 'cash_sheet',
      resourceId: String(data?.id ?? sheet.entry_date),
      newValues: { entry_date: sheet.entry_date, total_ca: sheet.total_ca, total_depense: sheet.total_depense },
    });

    return NextResponse.json({ success: true, sheet: data });
  } catch (error) {
    console.error('Cash sheet POST error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
