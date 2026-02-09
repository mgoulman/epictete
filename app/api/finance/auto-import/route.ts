import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { LaCaisseService, getDefaultLaCaisseConfig } from '@/lib/lacaisse/service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Parse request body for date range
    const body = await request.json().catch(() => ({}));
    
    // Default to last 7 days if no dates provided
    const endDate = body.endDate ? new Date(body.endDate) : new Date();
    const startDate = body.startDate 
      ? new Date(body.startDate) 
      : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get LaCaisse config
    const config = getDefaultLaCaisseConfig();
    
    if (!config.login || !config.password || !config.caisseId) {
      return NextResponse.json(
        { error: 'LaCaisse credentials not configured. Set LACAISSE_LOGIN, LACAISSE_PASSWORD, and LACAISSE_CAISSE_ID environment variables.' },
        { status: 500 }
      );
    }

    // Initialize service and fetch data
    const service = new LaCaisseService(config);
    
    // Authenticate
    await service.authenticate();
    
    // Fetch export
    const excelBuffer = await service.fetchExport(startDate, endDate, 'detailed');
    
    // Parse Excel data
    const salesData = service.parseExcel(excelBuffer);
    
    if (salesData.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No data found for the specified date range',
        totalRows: 0,
        insertedRows: 0,
        skippedDuplicates: 0
      });
    }

    // Create import batch record
    const { data: importBatch, error: importError } = await supabase
      .from('sales_imports')
      .insert({
        filename: `lacaisse_auto_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`,
        records_count: salesData.length,
        status: 'processing'
      })
      .select()
      .single();

    if (importError) {
      console.error('Import batch error:', importError);
      return NextResponse.json({ error: 'Failed to create import batch' }, { status: 500 });
    }

    // Prepare sales items for upsert
    let totalAmount = 0;
    let minDate: string | null = null;
    let maxDate: string | null = null;
    let insertedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    const salesItems = salesData.map(row => {
      const saleDate = LaCaisseService.parseDate(row.date);
      const saleTime = LaCaisseService.parseTime(row.time);
      
      totalAmount += row.sellingPrice * row.quantity;

      if (saleDate) {
        if (!minDate || saleDate < minDate) minDate = saleDate;
        if (!maxDate || saleDate > maxDate) maxDate = saleDate;
      }

      return {
        ticket_number: row.ticketNumber,
        family: row.family,
        category: row.category,
        product_name: row.product || 'Unknown',
        sub_product: row.subProduct,
        barcode: row.barcode,
        item_type: row.itemType || 'Aliments',
        purchase_price_ht: row.purchasePriceHT,
        purchase_price_ttc: row.purchasePriceTTC,
        quantity: row.quantity,
        catalog_price: row.catalogPrice,
        selling_price: row.sellingPrice,
        tax_rate: row.tva,
        profit: row.profit,
        dine_in: row.dineIn,
        supplier: row.supplier,
        sale_date: saleDate,
        sale_time: saleTime,
        import_source: 'lacaisse_auto',
        lacaisse_order_id: row.orderId
      };
    });

    // Insert in batches with ON CONFLICT handling
    const batchSize = 100;
    
    for (let i = 0; i < salesItems.length; i += batchSize) {
      const batch = salesItems.slice(i, i + batchSize);
      
      // Use upsert with onConflict to handle duplicates
      const { data: upsertData, error: itemsError } = await supabase
        .from('sales_items')
        .upsert(batch, {
          onConflict: 'ticket_number,product_name,sale_date,sale_time,quantity',
          ignoreDuplicates: true // Skip duplicates instead of updating
        })
        .select('id');

      if (itemsError) {
        console.error('Batch insert error:', itemsError);
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${itemsError.message}`);
      } else {
        // Count actually inserted rows
        const insertedInBatch = upsertData?.length || 0;
        insertedCount += insertedInBatch;
        skippedCount += batch.length - insertedInBatch;
      }
    }

    // Update import batch with final stats
    const { error: updateError } = await supabase
      .from('sales_imports')
      .update({
        records_count: insertedCount,
        total_amount: totalAmount,
        date_range_start: minDate,
        date_range_end: maxDate,
        status: errors.length > 0 ? 'completed_with_errors' : 'completed'
      })
      .eq('id', importBatch.id);

    if (updateError) {
      console.error('Import batch update error:', updateError);
    }

    return NextResponse.json({
      success: true,
      importId: importBatch.id,
      totalRows: salesData.length,
      insertedRows: insertedCount,
      skippedDuplicates: skippedCount,
      totalAmount,
      dateRange: { start: minDate, end: maxDate },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Auto-import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Auto-import failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return current config status (without exposing credentials)
  const config = getDefaultLaCaisseConfig();
  
  return NextResponse.json({
    configured: !!(config.login && config.password && config.caisseId),
    caisseId: config.caisseId || null
  });
}
