import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { enforce } from '@/lib/auth/supabase-server';
import { plannedShiftFor } from '@/lib/schedule';

const TZ = 'Africa/Casablanca';
function localNow() {
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const [h, m] = time.split(':').map(Number);
  return { date, minutes: h * 60 + m };
}

// GET /api/presence/summary?date= — counts of present / late / absent vs scheduled
export async function GET(request: NextRequest) {
  const denied = await enforce('personnel.read'); if (denied) return denied;
  const { date: today, minutes: nowMin } = localNow();
  const date = new URL(request.url).searchParams.get('date') || today;

  const { rows: staff } = await db.query<{ id: string; schedule_config: unknown }>(
    'SELECT id, schedule_config FROM staff_members WHERE is_active = true'
  );
  const scheduled = staff
    .map(s => ({ id: s.id, planned: plannedShiftFor(s.schedule_config, date) }))
    .filter(s => s.planned);

  const { rows: recs } = await db.query<{ staff_id: string; status: string }>(
    'SELECT staff_id, status FROM attendance WHERE date = $1', [date]
  );
  const recById = new Map(recs.map(r => [r.staff_id, r.status]));

  let present = 0, late = 0, absent = 0;
  for (const s of scheduled) {
    const st = recById.get(s.id);
    if (st === 'late') late++;
    else if (st) present++;
    else {
      const start = s.planned!.start_time;
      const startMin = parseInt(start.slice(0, 2)) * 60 + parseInt(start.slice(3, 5));
      if (date < today || (date === today && nowMin > startMin)) absent++;
    }
  }
  return NextResponse.json({ scheduled: scheduled.length, present, late, absent });
}
