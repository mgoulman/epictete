import { NextRequest, NextResponse } from 'next/server';
import { runLacaisseSync } from '@/lib/lacaisse/sync';

export const maxDuration = 60;

// Daily POS sync (Vercel Cron — see vercel.json). Pulls the last ~30 days of
// KPIs + line items from LaCaisse so the dashboard and Liste Ventes stay current
// without anyone clicking "Import". If CRON_SECRET is set, require it.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const res = await runLacaisseSync();
    return NextResponse.json({ success: true, ...res });
  } catch (err) {
    console.error('lacaisse-sync cron error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
