import { NextRequest, NextResponse } from 'next/server';
import { runAllAlertGenerators } from '@/lib/notification-generators';

// Data-driven & scheduled alerts (supplier payments, vendor balances, payroll
// reminder, contract expiries). Vercel Cron — see vercel.json. If CRON_SECRET is
// set, require it. Each generator is idempotent so re-runs are safe.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const results = await runAllAlertGenerators();
    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error('alerts cron error:', err);
    return NextResponse.json({ error: 'Failed to run alerts' }, { status: 500 });
  }
}
