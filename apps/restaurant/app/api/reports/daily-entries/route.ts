import { NextRequest, NextResponse } from 'next/server';
import { enforce, getCurrentUserId } from '@/lib/auth/supabase-server';
import { createAuditLog } from '@/lib/auth/audit';
import { odooGetEntry, odooGetEntriesMonth, odooUpsertEntry } from '@/lib/odoo-cash';

// Daily entries (the per-day summary that backs the cash ledger) are stored in
// Odoo (epictete_feuille_caisse addon). This route is a thin authenticated proxy.

export async function GET(request: NextRequest) {
  const denied = await enforce('reports.read'); if (denied) return denied;
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const month = searchParams.get('month');

    if (date) {
      const entry = await odooGetEntry(date);
      return NextResponse.json({ entry });
    }

    if (month) {
      const entries = await odooGetEntriesMonth(month);
      // POS cross-reference (sales_items) is no longer sourced here.
      return NextResponse.json({ entries, posTotals: {} });
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
    const body = await request.json();
    if (!body.entry_date) {
      return NextResponse.json({ error: 'entry_date is required' }, { status: 400 });
    }

    const entry = await odooUpsertEntry(body);

    await createAuditLog({
      userId: await getCurrentUserId(),
      action: 'upsert',
      resourceType: 'daily_entry',
      resourceId: String(body.entry_date),
      newValues: { entry_date: body.entry_date },
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error('Daily entries POST error:', error);
    return NextResponse.json({ error: 'Failed to save daily entry' }, { status: 500 });
  }
}

// Validation/locking by row id was part of the (now hidden) suivi/recap tabs and
// the Neon schema. The Odoo-backed store is keyed by date; use POST to upsert.
export async function PATCH() {
  return NextResponse.json({ error: 'Not supported' }, { status: 501 });
}
