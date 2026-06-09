import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { createNotification } from '@/lib/notifications';

// Daily sales summary notification. Triggered by Vercel Cron (see vercel.json).
// Summarises the previous day's sales and posts a notification for finance roles.
export async function GET() {
  try {
    // Previous day (the cron runs just after midnight).
    const { rows: dayRows } = await db.query<{ d: string }>(
      "SELECT (now()::date - 1) AS d"
    );
    const day = dayRows[0].d;

    const { rows } = await db.query<{ total: string | null; tickets: string }>(
      `SELECT COALESCE(SUM(selling_price), 0) AS total, COUNT(*) AS tickets
       FROM sales_items WHERE sale_date = $1`,
      [day]
    );
    const total = Math.round(Number(rows[0]?.total || 0));
    const tickets = Number(rows[0]?.tickets || 0);

    await createNotification({
      type: 'daily_summary',
      title: 'Résumé des ventes',
      message: `Ventes du ${day} : ${total.toLocaleString('fr-FR')} MAD (${tickets} ligne${tickets > 1 ? 's' : ''}).`,
      severity: 'success',
      link: '/admin/finance?tab=sales',
      requiredPermission: 'finance.read',
      dedupKey: `daily_summary:${day}`,
    });

    return NextResponse.json({ success: true, day, total, tickets });
  } catch (err) {
    console.error('daily-summary cron error:', err);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
