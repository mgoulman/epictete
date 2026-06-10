import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { enforce } from '@/lib/auth/supabase-server';

// GET /api/presence?date=YYYY-MM-DD — attendance records for a date (manager view)
export async function GET(request: NextRequest) {
  const denied = await enforce('personnel.read'); if (denied) return denied;

  const date = new URL(request.url).searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

  const { rows } = await db.query(
    `SELECT a.staff_id, a.check_in_time, a.scheduled_start, a.status
     FROM attendance a
     WHERE a.date = $1`,
    [date]
  );
  return NextResponse.json({ records: rows });
}
