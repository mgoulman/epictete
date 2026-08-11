import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, enforce } from '@/lib/auth/supabase-server';

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

function normalizeStoredCashSheet<T extends Record<string, unknown>>(sheet: T | null): T | null {
  if (!sheet) return sheet;

  const totalCA = parseCashNumber(sheet.total_ca);
  const totalCB = parseCashNumber(sheet.total_cb);
  const glovoEspece = parseCashNumber(sheet.glovo_ttc_espece);
  const glovoOnline = parseCashNumber(sheet.glovo_ttc_online);

  const caisseEspeces = Math.max(0, totalCA - totalCB - glovoEspece - glovoOnline);
  const totalEspeces = caisseEspeces + glovoEspece;

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
    const totalDepense = paidItems.reduce((s: number, i: { amount: unknown }) => s + parseCashNumber(i.amount), 0);
    const totalCA = parseCashNumber(body.total_ca);
    const totalCB = parseCashNumber(body.total_cb);
    const glovoEspece = parseCashNumber(body.glovo_ttc_espece);
    const glovoOnline = parseCashNumber(body.glovo_ttc_online);
    const caisseEspeces = Math.max(0, totalCA - totalCB - glovoEspece - glovoOnline);
    const totalEspeces = caisseEspeces + glovoEspece;
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
      custom_columns: Array.isArray(body.custom_columns) ? body.custom_columns : [],
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

    // Graceful fallback if the custom_columns migration hasn't been applied yet:
    // retry the upsert without that field so saving still works (custom columns
    // just won't persist until `scripts/add-cash-sheet-custom-columns.mjs` runs).
    if (error && /custom_columns/i.test(error.message || '')) {
      const { custom_columns: _omit, ...sheetWithoutCustom } = sheet;
      void _omit;
      ({ data, error } = await upsertSheet(sheetWithoutCustom));
    }

    if (error) throw error;
    return NextResponse.json({ success: true, sheet: data });
  } catch (error) {
    console.error('Cash sheet POST error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
