import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, requirePermission } from '@/lib/auth/supabase-server';
import { computeSuggestions, formatWhatsApp, SuggestParams } from '@/lib/purchase-orders';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('finance.read');

    const { searchParams } = new URL(request.url);

    const params: SuggestParams = {
      lookback_days: clampInt(searchParams.get('lookback_days'), 1, 365, 14),
      lead_time_days: clampInt(searchParams.get('lead_time_days'), 1, 30, 3),
      safety_buffer_pct: clampFloat(searchParams.get('safety_buffer_pct'), 0, 2, 0.2),
    };

    const format = searchParams.get('format') === 'whatsapp' ? 'whatsapp' : 'json';

    const supabase = await createSupabaseServerClient();
    const result = await computeSuggestions(supabase, params);

    if (format === 'whatsapp') {
      return new NextResponse(formatWhatsApp(result), {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (err.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('Purchase order suggest error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function clampInt(value: string | null, min: number, max: number, fallback: number): number {
  if (value === null) return fallback;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function clampFloat(value: string | null, min: number, max: number, fallback: number): number {
  if (value === null) return fallback;
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}
