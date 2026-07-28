import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, enforce } from '@/lib/auth/supabase-server';

function normalizeStoredCashSheet<T extends Record<string, unknown>>(sheet: T | null): T | null {
  if (!sheet) return sheet;

  const totalCA = Number(sheet.total_ca) || 0;
  const totalCB = Number(sheet.total_cb) || 0;
  const glovoEspece = Number(sheet.glovo_ttc_espece) || 0;
  const glovoOnline = Number(sheet.glovo_ttc_online) || 0;
  const explicitCaisse = sheet.total_especes_caisse;

  const caisseEspeces =
    explicitCaisse !== null && explicitCaisse !== undefined
      ? Number(explicitCaisse) || 0
      : Math.max(0, totalCA - totalCB - glovoEspece - glovoOnline);
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
    const totalDepense = paidItems.reduce((s: number, i: { amount: number }) => s + (Number(i.amount) || 0), 0);
    const caisseEspeces = Number(body.total_especes_caisse ?? body.total_especes) || 0;
    const glovoEspece = Number(body.glovo_ttc_espece) || 0;
    const glovoOnline = Number(body.glovo_ttc_online) || 0;
    const totalCB = Number(body.total_cb) || 0;
    const totalEspeces = caisseEspeces + glovoEspece;
    const totalCA = totalCB + totalEspeces + glovoOnline;
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
      total_depense: Math.round(totalDepense * 100) / 100,
      reste_especes: Math.round(resteEspeces * 100) / 100,
      manager_name: body.manager_name || null,
      visa_caisse: body.visa_caisse || null,
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      created_by: user?.id || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('cash_sheets')
      .upsert(sheet, { onConflict: 'entry_date' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, sheet: data });
  } catch (error) {
    console.error('Cash sheet POST error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
