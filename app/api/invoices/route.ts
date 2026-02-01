import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';

// GET - List invoices for a vendor
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');

    let query = supabase
      .from('vendor_invoices')
      .select(`
        *,
        vendor:vendors(id, name),
        items:vendor_invoice_items(*),
        transaction:vendor_transactions(id, type, amount, date)
      `)
      .order('created_at', { ascending: false });

    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ invoices: data || [] });
  } catch (error) {
    console.error('Invoices GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

// POST - Confirm an extracted invoice (creates records + debt transaction)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();

    const {
      vendor_id,
      invoice_url,
      invoice_path,
      invoice_date,
      total_amount,
      items,
      raw_extraction,
      update_inventory
    } = body;

    if (!vendor_id || !invoice_url || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Create vendor_transactions record (debt)
    const { data: transaction, error: txError } = await supabase
      .from('vendor_transactions')
      .insert({
        vendor_id,
        type: 'debt',
        amount: total_amount,
        description: `Invoice scan - ${items.length} items`,
        date: invoice_date || new Date().toISOString().split('T')[0],
        reference: `INV-SCAN-${Date.now()}`
      })
      .select()
      .single();

    if (txError) throw txError;

    // 2. Create vendor_invoices record
    const { data: invoice, error: invError } = await supabase
      .from('vendor_invoices')
      .insert({
        vendor_id,
        invoice_url,
        invoice_path,
        invoice_date: invoice_date || new Date().toISOString().split('T')[0],
        total_amount,
        status: 'confirmed',
        vendor_transaction_id: transaction.id,
        raw_extraction: raw_extraction || null
      })
      .select()
      .single();

    if (invError) throw invError;

    // 3. Create vendor_invoice_items records
    const invoiceItems = items.map((item: {
      product_name: string;
      quantity: number;
      unit: string | null;
      unit_price: number;
      total_price: number;
      matched_inventory_id: string | null;
    }) => ({
      invoice_id: invoice.id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit: item.unit || null,
      unit_price: item.unit_price,
      total_price: item.total_price,
      matched_inventory_id: item.matched_inventory_id || null
    }));

    const { error: itemsError } = await supabase
      .from('vendor_invoice_items')
      .insert(invoiceItems);

    if (itemsError) throw itemsError;

    // 4. Optionally update inventory quantities and cost_per_unit for matched items
    let inventoryUpdates: Array<{ id: string; name: string; added: number; cost_per_unit?: number }> = [];
    if (update_inventory) {
      for (const item of items) {
        if (item.matched_inventory_id && item.quantity > 0) {
          // Get current quantity
          const { data: invItem } = await supabase
            .from('inventory_items')
            .select('id, name, quantity')
            .eq('id', item.matched_inventory_id)
            .single();

          if (invItem) {
            const newQty = Number(invItem.quantity) + Number(item.quantity);
            const updateFields: Record<string, unknown> = {
              quantity: newQty,
              updated_at: new Date().toISOString()
            };

            // Also update cost_per_unit from invoice unit_price
            if (item.unit_price != null && Number(item.unit_price) > 0) {
              updateFields.cost_per_unit = Number(item.unit_price);
            }

            const { error: updateErr } = await supabase
              .from('inventory_items')
              .update(updateFields)
              .eq('id', item.matched_inventory_id);

            if (!updateErr) {
              inventoryUpdates.push({
                id: invItem.id,
                name: invItem.name,
                added: item.quantity,
                ...(updateFields.cost_per_unit != null ? { cost_per_unit: Number(updateFields.cost_per_unit) } : {})
              });
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      invoice,
      transaction,
      inventory_updates: inventoryUpdates
    });
  } catch (error) {
    console.error('Invoices POST error:', error);
    return NextResponse.json({ error: 'Failed to confirm invoice' }, { status: 500 });
  }
}
