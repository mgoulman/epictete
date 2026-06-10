import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from '@/lib/auth/supabase-server';
import { plannedShiftFor } from '@/lib/schedule';

const TZ = 'Africa/Casablanca';
const LATE_GRACE_MIN = 5;

// Current local date (YYYY-MM-DD) and time (minutes since midnight) in the restaurant TZ.
function localNow() {
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const [h, m] = time.split(':').map(Number);
  return { date, time, minutes: h * 60 + m };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}

// POST /api/presence/checkin — auto-records the logged-in staff member's presence
// for today if they are scheduled, validating against the planning.
export async function POST() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Resolve the staff member linked to this login.
  const { rows: staffRows } = await db.query<{ id: string; first_name: string; last_name: string; schedule_config: unknown }>(
    'SELECT id, first_name, last_name, schedule_config FROM staff_members WHERE profile_id = $1 AND is_active = true LIMIT 1',
    [session.id]
  );
  if (staffRows.length === 0) {
    return NextResponse.json({ linked: false });
  }
  const staff = staffRows[0];

  const { date, time, minutes } = localNow();
  const planned = plannedShiftFor(staff.schedule_config, date);
  if (!planned) {
    return NextResponse.json({ linked: true, scheduled: false });
  }

  // Already recorded today?
  const { rows: existing } = await db.query<{ check_in_time: string; status: string; scheduled_start: string }>(
    'SELECT check_in_time, status, scheduled_start FROM attendance WHERE staff_id = $1 AND date = $2',
    [staff.id, date]
  );
  if (existing.length > 0) {
    return NextResponse.json({ linked: true, scheduled: true, planned, attendance: existing[0], alreadyChecked: true });
  }

  const late = minutes > toMinutes(planned.start_time) + LATE_GRACE_MIN;
  const status = late ? 'late' : 'present';

  const { rows: inserted } = await db.query<{ check_in_time: string; status: string; scheduled_start: string }>(
    `INSERT INTO attendance (staff_id, date, check_in_time, scheduled_start, status)
     VALUES ($1, $2, now(), $3, $4)
     ON CONFLICT (staff_id, date) DO NOTHING
     RETURNING check_in_time, status, scheduled_start`,
    [staff.id, date, planned.start_time, status]
  );

  return NextResponse.json({
    linked: true,
    scheduled: true,
    planned,
    checkInTime: time,
    attendance: inserted[0] || { status, scheduled_start: planned.start_time },
  });
}
