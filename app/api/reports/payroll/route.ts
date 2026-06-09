import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId, enforce } from '@/lib/auth/supabase-server';

// GET /api/reports/payroll?month=YYYY-MM
export async function GET(request: NextRequest) {
  const denied = await enforce('reports.read'); if (denied) return denied;
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 });

    const [y, m] = month.split('-').map(Number);
    const firstDay = `${month}-01`;
    const lastDay = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;

    const { rows } = await db.query(
      `SELECT id, pay_month, employee_name, working_days, day_offs, holidays,
              cnss, tac, total, notes, created_at, updated_at
       FROM payroll_entries
       WHERE pay_month BETWEEN $1 AND $2
       ORDER BY employee_name, created_at`,
      [firstDay, lastDay]
    );

    return NextResponse.json({ entries: rows });
  } catch (error) {
    console.error('Payroll GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await enforce('reports.write'); if (denied) return denied;
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.pay_month || !body.employee_name) {
      return NextResponse.json({ error: 'pay_month and employee_name required' }, { status: 400 });
    }

    const { rows } = await db.query(
      `INSERT INTO payroll_entries
        (pay_month, employee_name, working_days, day_offs, holidays, cnss, tac, total, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        body.pay_month,
        body.employee_name,
        Number(body.working_days) || 0,
        Number(body.day_offs) || 0,
        Number(body.holidays) || 0,
        Number(body.cnss) || 0,
        Number(body.tac) || 0,
        Number(body.total) || 0,
        body.notes || null,
        userId,
      ]
    );

    return NextResponse.json({ success: true, entry: rows[0] });
  } catch (error) {
    console.error('Payroll POST error:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const denied = await enforce('reports.write'); if (denied) return denied;
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const body = await request.json();
    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    const allowed = ['pay_month', 'employee_name', 'working_days', 'day_offs', 'holidays', 'cnss', 'tac', 'total', 'notes'];
    const numericFields = new Set(['working_days', 'day_offs', 'holidays', 'cnss', 'tac', 'total']);
    for (const key of allowed) {
      if (key in body) {
        fields.push(`${key} = $${idx++}`);
        params.push(numericFields.has(key) ? Number(body[key]) || 0 : body[key]);
      }
    }
    if (fields.length === 0) {
      return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
    }
    fields.push(`updated_at = NOW()`);
    params.push(id);

    const { rows } = await db.query(
      `UPDATE payroll_entries SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (rows.length === 0) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ success: true, entry: rows[0] });
  } catch (error) {
    console.error('Payroll PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const denied = await enforce('reports.write'); if (denied) return denied;
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { rowCount } = await db.query(`DELETE FROM payroll_entries WHERE id = $1`, [id]);
    if (rowCount === 0) return NextResponse.json({ error: 'not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payroll DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
