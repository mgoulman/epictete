import { NextRequest, NextResponse } from 'next/server';
import { enforce } from '@/lib/auth/supabase-server';
import { odooListSheets } from '@/lib/odoo-cash';
import { computeRunningBalance, LEDGER_START_DATE, LEDGER_OPENING_BALANCE } from '@/lib/finance/cash-ledger';

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
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    // Read every sheet from the single source of truth (Odoo), already date-ascending,
    // starting on LEDGER_START_DATE with LEDGER_OPENING_BALANCE carried in (0 = fresh
    // start). This is the SAME store the per-day sheet route reads/writes, so the
    // cumulative reconciles exactly with each day's "reste en espèces".
    const fromStart = await odooListSheets(LEDGER_START_DATE);
    const rows = computeRunningBalance(fromStart as Array<Record<string, unknown>>, LEDGER_OPENING_BALANCE);
    const allTime = rows.length ? rows[rows.length - 1].closing : LEDGER_OPENING_BALANCE;

    if (date) {
      const beforeStart = date < LEDGER_START_DATE;
      const onDay = rows.find((r) => r.date === date) || null;
      const before = rows.filter((r) => r.date < date);
      const opening = onDay
        ? onDay.opening
        : before.length
          ? before[before.length - 1].closing
          : LEDGER_OPENING_BALANCE;
      return NextResponse.json({
        allTime,
        count: rows.length,
        opening,
        dayNet: onDay ? onDay.dayNet : 0,
        closing: onDay ? onDay.closing : opening,
        hasSheet: !!onDay,
        startDate: LEDGER_START_DATE,
        beforeStart,
      });
    }

    return NextResponse.json({ allTime, count: rows.length, series: rows, startDate: LEDGER_START_DATE });
  } catch (err) {
    console.error('Cash ledger GET error:', err);
    return NextResponse.json({ error: 'Failed to compute cash ledger' }, { status: 500 });
  }
}
