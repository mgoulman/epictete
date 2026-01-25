import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';

// GET - Fetch vendors or transactions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'vendors';
    const vendorId = searchParams.get('vendorId');

    if (type === 'vendors') {
      // Get all vendors with their balance
      const { data: vendors, error } = await supabase
        .from('vendors')
        .select('*')
        .order('name');

      if (error) throw error;

      // Calculate balance for each vendor
      const vendorsWithBalance = await Promise.all(
        (vendors || []).map(async (vendor) => {
          const { data: transactions } = await supabase
            .from('vendor_transactions')
            .select('type, amount')
            .eq('vendor_id', vendor.id);

          let balance = 0;
          (transactions || []).forEach(t => {
            if (t.type === 'debt') balance += Number(t.amount);
            if (t.type === 'payment') balance -= Number(t.amount);
          });

          return { ...vendor, balance };
        })
      );

      return NextResponse.json({ vendors: vendorsWithBalance });
    }

    if (type === 'transactions') {
      let query = supabase
        .from('vendor_transactions')
        .select(`*, vendor:vendors(id, name)`)
        .order('date', { ascending: false });

      if (vendorId) {
        query = query.eq('vendor_id', vendorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ transactions: data });
    }

    if (type === 'summary') {
      // Get total owed to all vendors
      const { data: vendors } = await supabase
        .from('vendors')
        .select('id')
        .eq('is_active', true);

      let totalOwed = 0;
      let totalPaid = 0;

      for (const vendor of vendors || []) {
        const { data: transactions } = await supabase
          .from('vendor_transactions')
          .select('type, amount')
          .eq('vendor_id', vendor.id);

        (transactions || []).forEach(t => {
          if (t.type === 'debt') totalOwed += Number(t.amount);
          if (t.type === 'payment') totalPaid += Number(t.amount);
        });
      }

      return NextResponse.json({
        totalOwed,
        totalPaid,
        balance: totalOwed - totalPaid,
        vendorCount: vendors?.length || 0
      });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Vendors GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

// POST - Create vendor or transaction
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { type, ...data } = body;

    if (type === 'vendor') {
      const { data: result, error } = await supabase
        .from('vendors')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, vendor: result });
    }

    if (type === 'transaction') {
      const { transaction_type, ...transactionData } = data;
      const { data: result, error } = await supabase
        .from('vendor_transactions')
        .insert({ ...transactionData, type: transaction_type })
        .select(`*, vendor:vendors(id, name)`)
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, transaction: result });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Vendors POST error:', error);
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
  }
}

// PATCH - Update vendor or transaction
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { type, id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    if (type === 'vendor') {
      const { data: result, error } = await supabase
        .from('vendors')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, vendor: result });
    }

    if (type === 'transaction') {
      const { data: result, error } = await supabase
        .from('vendor_transactions')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, transaction: result });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Vendors PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
  }
}

// DELETE - Remove vendor or transaction
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json({ error: 'Type and ID required' }, { status: 400 });
    }

    const table = type === 'vendor' ? 'vendors' : 'vendor_transactions';

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vendors DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
  }
}
