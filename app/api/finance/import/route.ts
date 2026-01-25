import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import * as XLSX from 'xlsx';

interface SalesRow {
  'Id commande'?: string;
  'N° commande canal'?: string;
  'Canal de vente'?: string;
  'Caisse'?: string;
  'Nom caissier'?: string;
  'Serveur'?: string;
  'Date'?: string;
  'Heure'?: string;
  'Num ticket'?: string;
  'Titre ticket'?: string;
  'Famille'?: string;
  'Categorie'?: string;
  'Produit'?: string;
  'Sous produit'?: string;
  'Code barre'?: string;
  'Type'?: string;
  'Prix achat HT'?: number;
  'Prix achat TTC'?: number;
  'Quantité'?: number;
  'Prix catalogue'?: number;
  'Prix de vente'?: number;
  'TVA'?: number;
  'Bénéfice'?: number;
  'SurPlace'?: string;
  'NomClient'?: string;
  'PrénomClient'?: string;
  'TelClient'?: string;
  'Moyens de paiements'?: string;
  'Type de vente'?: string;
  'Fournisseur'?: string;
  'Id déclinaison'?: string;
}

function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  // Handle format YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return dateStr;
  }
  return null;
}

function parseTime(timeStr: string | undefined): string | null {
  if (!timeStr) return null;
  // Handle format HH:MM or HH:M
  if (timeStr.includes(':')) {
    const [h, m] = timeStr.split(':');
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`;
  }
  return null;
}

// Helper to get value from row with flexible column matching
function getColumnValue(row: Record<string, unknown>, possibleNames: string[]): unknown {
  for (const name of possibleNames) {
    // Try exact match first
    if (row[name] !== undefined) return row[name];
    // Try case-insensitive match
    const lowerName = name.toLowerCase();
    for (const key of Object.keys(row)) {
      if (key.toLowerCase() === lowerName || key.toLowerCase().trim() === lowerName) {
        return row[key];
      }
    }
  }
  return undefined;
}

function getStringValue(row: Record<string, unknown>, possibleNames: string[]): string | null {
  const val = getColumnValue(row, possibleNames);
  return val != null ? String(val) : null;
}

function getNumberValue(row: Record<string, unknown>, possibleNames: string[], defaultVal = 0): number {
  const val = getColumnValue(row, possibleNames);
  if (val == null) return defaultVal;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
  return isNaN(num) ? defaultVal : num;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: SalesRow[] = XLSX.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      return NextResponse.json({ error: 'No data found in file' }, { status: 400 });
    }

    // Create import batch
    const { data: importBatch, error: importError } = await supabase
      .from('sales_imports')
      .insert({
        filename: file.name,
        records_count: data.length,
        status: 'processing'
      })
      .select()
      .single();

    if (importError) {
      console.error('Import batch error:', importError);
      return NextResponse.json({ error: 'Failed to create import batch' }, { status: 500 });
    }

    // Process data with flexible column matching
    let totalAmount = 0;
    let minDate: string | null = null;
    let maxDate: string | null = null;

    // Insert sales items (we'll store items directly for simplicity)
    const salesItems = data.map(row => {
      const rowData = row as Record<string, unknown>;

      const sellingPrice = getNumberValue(rowData, ['Prix de vente', 'Prix vente', 'prix de vente', 'PrixVente']);
      const quantity = getNumberValue(rowData, ['Quantité', 'Quantite', 'quantité', 'Qté', 'Qty'], 1);
      const saleDate = parseDate(getStringValue(rowData, ['Date', 'date']) || undefined);

      // Calculate totals
      totalAmount += sellingPrice * quantity;

      if (saleDate) {
        if (!minDate || saleDate < minDate) minDate = saleDate;
        if (!maxDate || saleDate > maxDate) maxDate = saleDate;
      }

      return {
        ticket_number: getStringValue(rowData, ['Num ticket', 'N° ticket', 'Ticket', 'NumTicket']),
        family: getStringValue(rowData, ['Famille', 'famille', 'Family']),
        category: getStringValue(rowData, ['Categorie', 'Catégorie', 'categorie', 'Category']),
        product_name: getStringValue(rowData, ['Produit', 'produit', 'Product', 'Nom']) || 'Unknown',
        sub_product: getStringValue(rowData, ['Sous produit', 'SousProduit', 'sous produit']),
        barcode: getStringValue(rowData, ['Code barre', 'CodeBarre', 'Barcode']),
        item_type: getStringValue(rowData, ['Type', 'type']) || 'Aliments',
        purchase_price_ht: getNumberValue(rowData, ['Prix achat HT', 'PrixAchatHT', 'prix achat ht']),
        purchase_price_ttc: getNumberValue(rowData, ['Prix achat TTC', 'PrixAchatTTC', 'prix achat ttc']),
        quantity,
        catalog_price: getNumberValue(rowData, ['Prix catalogue', 'PrixCatalogue', 'prix catalogue']),
        selling_price: sellingPrice,
        tax_rate: getNumberValue(rowData, ['TVA', 'tva', 'Tax'], 10),
        profit: getNumberValue(rowData, ['Bénéfice', 'Benefice', 'bénéfice', 'Profit']),
        dine_in: getStringValue(rowData, ['SurPlace', 'Sur Place', 'surplace']) === 'Sur place',
        supplier: getStringValue(rowData, ['Fournisseur', 'fournisseur', 'Supplier']),
        sale_date: saleDate,
        sale_time: parseTime(getStringValue(rowData, ['Heure', 'heure', 'Time', 'Hour']) || undefined)
      };
    });

    // Insert in batches of 100
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < salesItems.length; i += batchSize) {
      const batch = salesItems.slice(i, i + batchSize);
      const { error: itemsError } = await supabase
        .from('sales_items')
        .insert(batch);

      if (itemsError) {
        console.error('Items insert error:', itemsError);
      } else {
        insertedCount += batch.length;
      }
    }

    // Update import batch with final stats
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

    return NextResponse.json({
      success: true,
      importId: importBatch.id,
      recordsImported: insertedCount,
      totalAmount,
      dateRange: { start: minDate, end: maxDate }
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
