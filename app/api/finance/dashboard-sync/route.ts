import { NextRequest, NextResponse } from 'next/server';
import { runLacaisseSync } from '@/lib/lacaisse/sync';
import { enforce } from '@/lib/auth/supabase-server';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const denied = await enforce('finance.write'); if (denied) return denied;
  try {
    const body = await request.json().catch(() => ({}));
    const res = await runLacaisseSync({ startDate: body.startDate, endDate: body.endDate });
    return NextResponse.json({ success: true, ...res });
  } catch (err) {
    console.error('dashboard-sync error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
