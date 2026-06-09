import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUserId, enforce } from '@/lib/auth/supabase-server';

// GET /api/reports/misc-expenses?month=YYYY-MM
//   or /api/reports/misc-expenses?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const denied = await enforce('reports.read'); if (denied) return denied;
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let where = '';
    const params: unknown[] = [];

    if (month) {
      const [y, m] = month.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      where = 'WHERE expense_date BETWEEN $1 AND $2';
      params.push(`${month}-01`, `${month}-${String(lastDay).padStart(2, '0')}`);
    } else if (startDate && endDate) {
      where = 'WHERE expense_date BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    }

    const { rows } = await db.query(
      `SELECT id, expense_date, amount, description, justification, receipt_url, receipt_path, created_at, updated_at
       FROM misc_expenses ${where}
       ORDER BY expense_date DESC, created_at DESC`,
      params
    );

    return NextResponse.json({ entries: rows });
  } catch (error) {
    console.error('Misc expenses GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await enforce('reports.write'); if (denied) return denied;
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.expense_date || body.amount === undefined || body.amount === null) {
      return NextResponse.json({ error: 'expense_date and amount are required' }, { status: 400 });
    }

    const { rows } = await db.query(
      `INSERT INTO misc_expenses
        (expense_date, amount, description, justification, receipt_url, receipt_path, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        body.expense_date,
        Number(body.amount) || 0,
        body.description || null,
        body.justification || null,
        body.receipt_url || null,
        body.receipt_path || null,
        userId,
      ]
    );

    return NextResponse.json({ success: true, entry: rows[0] });
  } catch (error) {
    console.error('Misc expenses POST error:', error);
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

    const allowed = ['expense_date', 'amount', 'description', 'justification', 'receipt_url', 'receipt_path'];
    for (const key of allowed) {
      if (key in body) {
        fields.push(`${key} = $${idx++}`);
        params.push(key === 'amount' ? Number(body[key]) || 0 : body[key]);
      }
    }
    if (fields.length === 0) {
      return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
    }
    fields.push(`updated_at = NOW()`);
    params.push(id);

    const { rows } = await db.query(
      `UPDATE misc_expenses SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (rows.length === 0) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ success: true, entry: rows[0] });
  } catch (error) {
    console.error('Misc expenses PATCH error:', error);
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

    const { rowCount } = await db.query(`DELETE FROM misc_expenses WHERE id = $1`, [id]);
    if (rowCount === 0) return NextResponse.json({ error: 'not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Misc expenses DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
