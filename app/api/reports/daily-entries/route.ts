import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, enforce } from '@/lib/auth/supabase-server';

export async function GET(request: NextRequest) {
  const denied = await enforce('reports.read'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const month = searchParams.get('month');

    if (date) {
      const { data, error } = await supabase
        .from('daily_entries')
        .select('*')
        .eq('entry_date', date)
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json({ entry: data });
    }

    if (month) {
      // month format: 2026-04
      const startDate = `${month}-01`;
      const [y, m] = month.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('daily_entries')
        .select('*')
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)
        .order('entry_date', { ascending: true });

      if (error) throw error;

      // Also get POS sales totals for cross-reference
      const { data: posTotals } = await supabase
        .from('sales_items')
        .select('sale_date, selling_price, quantity')
        .gte('sale_date', startDate)
        .lte('sale_date', endDate);

      const posByDate: Record<string, number> = {};
      for (const item of posTotals || []) {
        const d = item.sale_date;
        posByDate[d] = (posByDate[d] || 0) + (item.selling_price || 0) * (item.quantity || 1);
      }

      return NextResponse.json({ entries: data || [], posTotals: posByDate });
    }

    return NextResponse.json({ error: 'Provide date or month parameter' }, { status: 400 });
  } catch (error) {
    console.error('Daily entries GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch daily entries' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await enforce('reports.write'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();

    const { data: user } = await supabase.auth.getUser();

    const entry = {
      entry_date: body.entry_date,
      revenue_card: body.revenue_card || 0,
      revenue_cash: body.revenue_cash || 0,
      revenue_transfer: body.revenue_transfer || 0,
      expense_cash: body.expense_cash || 0,
      expense_cash_desc: body.expense_cash_desc || null,
      expense_card_pro: body.expense_card_pro || 0,
      expense_card_pro_desc: body.expense_card_pro_desc || null,
      expense_tpe: body.expense_tpe || 0,
      expense_tpe_desc: body.expense_tpe_desc || null,
      withdrawal_pro: body.withdrawal_pro || 0,
      withdrawal_pro_desc: body.withdrawal_pro_desc || null,
      withdrawal_perso: body.withdrawal_perso || 0,
      withdrawal_perso_desc: body.withdrawal_perso_desc || null,
      observations: body.observations || null,
      status: body.status || 'draft',
      created_by: user?.user?.id || null,
    };

    if (!entry.entry_date) {
      return NextResponse.json({ error: 'entry_date is required' }, { status: 400 });
    }

    // Upsert: create or update for the same date
    const { data, error } = await supabase
      .from('daily_entries')
      .upsert(entry, { onConflict: 'entry_date' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, entry: data });
  } catch (error) {
    console.error('Daily entries POST error:', error);
    return NextResponse.json({ error: 'Failed to save daily entry' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const denied = await enforce('reports.write'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Handle validation
    if (updates.status === 'validated') {
      const { data: user } = await supabase.auth.getUser();
      updates.validated_by = user?.user?.id || null;
      updates.validated_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('daily_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, entry: data });
  } catch (error) {
    console.error('Daily entries PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update daily entry' }, { status: 500 });
  }
}
