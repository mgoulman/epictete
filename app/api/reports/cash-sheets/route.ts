import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';

// GET /api/reports/cash-sheets?date=YYYY-MM-DD
export async function GET(request: NextRequest) {
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
    return NextResponse.json({ sheet: data });
  } catch (error) {
    console.error('Cash sheet GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// POST — upsert
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { data: { user } } = await supabase.auth.getUser();

    if (!body.entry_date) return NextResponse.json({ error: 'entry_date required' }, { status: 400 });

    // Calculate totals
    const paidItems = body.paid_items || [];
    const totalDepense = paidItems.reduce((s: number, i: { amount: number }) => s + (Number(i.amount) || 0), 0);
    const resteEspeces = (Number(body.total_especes) || 0) - totalDepense;

    const sheet = {
      entry_date: body.entry_date,
      total_ca: Number(body.total_ca) || 0,
      total_cb: Number(body.total_cb) || 0,
      total_especes: Number(body.total_especes) || 0,
      especes_note: body.especes_note || null,
      paid_items: paidItems,
      unpaid_items: body.unpaid_items || [],
      paid_outside_items: body.paid_outside_items || [],
      total_depense: Math.round(totalDepense * 100) / 100,
      reste_especes: Math.round(resteEspeces * 100) / 100,
      manager_name: body.manager_name || null,
      visa_caisse: body.visa_caisse || null,
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
