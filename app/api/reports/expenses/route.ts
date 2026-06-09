import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, enforce } from '@/lib/auth/supabase-server';

export async function GET(request: NextRequest) {
  const denied = await enforce('reports.read'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');
    const paymentMethod = searchParams.get('paymentMethod');
    const dailyEntryId = searchParams.get('dailyEntryId');

    let query = supabase
      .from('expenses')
      .select('*, vendor:vendors(id, name)')
      .order('expense_date', { ascending: false });

    if (startDate) query = query.gte('expense_date', startDate);
    if (endDate) query = query.lte('expense_date', endDate);
    if (category) query = query.eq('category', category);
    if (paymentMethod) query = query.eq('payment_method', paymentMethod);
    if (dailyEntryId) query = query.eq('daily_entry_id', dailyEntryId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ expenses: data || [] });
  } catch (error) {
    console.error('Expenses GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await enforce('reports.write'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { data: user } = await supabase.auth.getUser();

    const expense = {
      expense_date: body.expense_date,
      amount: body.amount,
      payment_method: body.payment_method,
      category: body.category,
      description: body.description,
      vendor_id: body.vendor_id || null,
      vendor_transaction_id: body.vendor_transaction_id || null,
      daily_entry_id: body.daily_entry_id || null,
      receipt_url: body.receipt_url || null,
      receipt_path: body.receipt_path || null,
      created_by: user?.user?.id || null,
    };

    if (!expense.expense_date || !expense.amount || !expense.payment_method || !expense.category || !expense.description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert(expense)
      .select('*, vendor:vendors(id, name)')
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, expense: data });
  } catch (error) {
    console.error('Expenses POST error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const denied = await enforce('reports.write'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select('*, vendor:vendors(id, name)')
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, expense: data });
  } catch (error) {
    console.error('Expenses PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const denied = await enforce('reports.write'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Expenses DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
