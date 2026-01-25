import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LaCaisseService, getDefaultLaCaisseConfig } from '@/lib/lacaisse/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Morocco timezone offset (UTC+1, no DST)
const MOROCCO_OFFSET_HOURS = 1;

/**
 * Get current date in Morocco timezone
 * Works correctly regardless of server timezone (Vercel, Linux, etc.)
 */
function getMoroccoDate(): Date {
  const now = new Date();
  // Get UTC time and add Morocco offset
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utcTime + (MOROCCO_OFFSET_HOURS * 3600000));
}

/**
 * Get a date string in YYYY-MM-DD format for Morocco timezone
 */
function formatDateForQuery(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Initialize Supabase with service role for cron jobs
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get LaCaisse config
    const config = getDefaultLaCaisseConfig();
    
    if (!config.login || !config.password || !config.caisseId) {
      return NextResponse.json(
        { error: 'LaCaisse credentials not configured' },
        { status: 500 }
      );
    }

    // Calculate date range in Morocco timezone
    // At 01:01 AM Morocco time, we sync yesterday's complete data
    const moroccoNow = getMoroccoDate();
    const yesterday = new Date(moroccoNow);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Fetch from start of yesterday to end of yesterday (complete day)
    const startDate = yesterday;
    const endDate = moroccoNow; // Include any late-night transactions
    
    console.log(`[Cron] Morocco time: ${moroccoNow.toISOString()}`);
    console.log(`[Cron] Syncing from ${formatDateForQuery(startDate)} to ${formatDateForQuery(endDate)}`);

    // Initialize service and fetch data
    const service = new LaCaisseService(config);
    await service.authenticate();
    
    const excelBuffer = await service.fetchExport(startDate, endDate, 'detailed');
    const salesData = service.parseExcel(excelBuffer);
    
    if (salesData.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new data to import',
        totalRows: 0,
        insertedRows: 0,
        skippedDuplicates: 0,
        timestamp: new Date().toISOString()
      });
    }

    // Create import batch record
    const { data: importBatch, error: importError } = await supabase
      .from('sales_imports')
      .insert({
        filename: `cron_sync_${formatDateForQuery(yesterday)}_${formatDateForQuery(moroccoNow)}`,
        records_count: salesData.length,
        status: 'processing'
      })
      .select()
      .single();

    if (importError) {
      console.error('Import batch error:', importError);
      return NextResponse.json({ error: 'Failed to create import batch' }, { status: 500 });
    }

    // Process and insert data
    let totalAmount = 0;
    let minDate: string | null = null;
    let maxDate: string | null = null;
    let insertedCount = 0;
    let skippedCount = 0;

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
        import_source: 'cron_auto',
        lacaisse_order_id: row.orderId
      };
    });

    // Insert in batches with deduplication
    const batchSize = 100;
    
    for (let i = 0; i < salesItems.length; i += batchSize) {
      const batch = salesItems.slice(i, i + batchSize);
      
      const { data: upsertData, error: itemsError } = await supabase
        .from('sales_items')
        .upsert(batch, {
          onConflict: 'ticket_number,product_name,sale_date,sale_time,quantity',
          ignoreDuplicates: true
        })
        .select('id');

      if (itemsError) {
        console.error('Batch insert error:', itemsError);
      } else {
        const insertedInBatch = upsertData?.length || 0;
        insertedCount += insertedInBatch;
        skippedCount += batch.length - insertedInBatch;
      }
    }

    // Update import batch
    await supabase
      .from('sales_imports')
      .update({
        records_count: insertedCount,
        total_amount: totalAmount,
        date_range_start: minDate,
        date_range_end: maxDate,
        status: 'completed'
      })
      .eq('id', importBatch.id);

    const result = {
      success: true,
      importId: importBatch.id,
      totalRows: salesData.length,
      insertedRows: insertedCount,
      skippedDuplicates: skippedCount,
      totalAmount,
      dateRange: { start: minDate, end: maxDate },
      timestamp: new Date().toISOString()
    };

    console.log('Cron sync completed:', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Cron sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron sync failed' },
      { status: 500 }
    );
  }
}
