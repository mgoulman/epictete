import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { createNotification } from '@/lib/notifications';

// Daily sales summary notification. Triggered by Vercel Cron (see vercel.json).
// Summarises the previous day's sales and posts a notification for finance roles.
export async function GET() {
  try {
    // Previous day (the cron runs just after midnight, Africa/Casablanca).
    const { rows: dayRows } = await db.query<{ d: string }>(
      "SELECT ((now() AT TIME ZONE 'Africa/Casablanca')::date - 1) AS d"
    );
    const day = dayRows[0].d;

    // Prefer the authoritative POS daily total (same source as the dashboard).
    const { rows: lc } = await db.query<{ revenue: number; transactions: number }>(
      `SELECT COALESCE(revenue,0)::float AS revenue, COALESCE(transactions,0)::int AS transactions
       FROM lacaisse_daily WHERE date = $1`,
      [day]
    );

    let total: number;
    let unitLabel: string;
    let count: number;
    if (lc.length > 0) {
      total = Math.round(lc[0].revenue);
      count = lc[0].transactions;
      unitLabel = `ticket${count > 1 ? 's' : ''}`;
    } else {
      // Fallback: sum the day's sale lines (selling_price is per unit).
      const { rows } = await db.query<{ total: number; lignes: number }>(
        `SELECT COALESCE(SUM(selling_price * quantity), 0)::float AS total, COUNT(*)::int AS lignes
         FROM sales_items WHERE sale_date = $1`,
        [day]
      );
      total = Math.round(rows[0]?.total || 0);
      count = rows[0]?.lignes || 0;
      unitLabel = `ligne${count > 1 ? 's' : ''}`;
    }

    await createNotification({
      type: 'daily_summary',
      title: 'Résumé des ventes',
      message: `Ventes du ${day} : ${total.toLocaleString('fr-FR')} MAD (${count} ${unitLabel}).`,
      severity: 'success',
      link: '/admin/finance?tab=sales',
      requiredPermission: 'finance.read',
      dedupKey: `daily_summary:${day}`,
    });

    return NextResponse.json({ success: true, day, total, count });
  } catch (err) {
    console.error('daily-summary cron error:', err);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
