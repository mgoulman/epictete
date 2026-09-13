import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, enforce } from '@/lib/auth/supabase-server';
import { computeRunningBalance } from '@/lib/finance/cash-ledger';

// GET /api/reports/cash-ledger
//   ?date=YYYY-MM-DD  → { allTime, opening, dayNet, closing, count } for that day
//   (no date)         → { allTime, count, series: LedgerRow[] }
//
// The running "solde espèces cumulé" derived from every stored cash_sheet, in
// date order, starting from 0. Read-only — never writes. `opening` for a date =
// cumulative closing of all days strictly before it (so a live UI can show
// opening + today's live day-net as the running closing).
export async function GET(request: NextRequest) {
  const denied = await enforce('reports.read');
  if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const { data, error } = await supabase
      .from('cash_sheets')
      .select(
        'entry_date, total_ca, total_cb, glovo_ttc_espece, glovo_ttc_online, payment_sources, paid_items, unpaid_items, paid_outside_items, custom_columns, column_flags',
      )
      .order('entry_date', { ascending: true });

    if (error) throw error;

    const rows = computeRunningBalance((data as Array<Record<string, unknown>>) || []);
    const allTime = rows.length ? rows[rows.length - 1].closing : 0;

    if (date) {
      const before = rows.filter((r) => r.date < date);
      const opening = before.length ? before[before.length - 1].closing : 0;
      const onDay = rows.find((r) => r.date === date) || null;
      return NextResponse.json({
        allTime,
        count: rows.length,
        opening,
        dayNet: onDay ? onDay.dayNet : 0,
        closing: onDay ? onDay.closing : opening,
        hasSheet: !!onDay,
      });
    }

    return NextResponse.json({ allTime, count: rows.length, series: rows });
  } catch (err) {
    console.error('Cash ledger GET error:', err);
    return NextResponse.json({ error: 'Failed to compute cash ledger' }, { status: 500 });
  }
}
