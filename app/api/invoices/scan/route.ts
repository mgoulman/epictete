import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey
);

// --- Fuzzy matching helpers ---
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s]/g, '');    // keep only alphanumeric + spaces
}

function tokenOverlapScore(a: string, b: string): number {
  const tokensA = new Set(normalize(a).split(/\s+/).filter(Boolean));
  const tokensB = new Set(normalize(b).split(/\s+/).filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let shared = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) shared++;
  }
  return shared / Math.max(tokensA.size, tokensB.size);
}

interface ExtractedItem {
  product_name: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  total_price: number;
}

interface InventoryMatch {
  id: string;
  name: string;
  score: number;
}

export async function POST(request: NextRequest) {
  try {
    if (!anthropicApiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const vendorId = formData.get('vendorId') as string;

    if (!file || !vendorId) {
      return NextResponse.json({ error: 'File and vendorId are required' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum 10MB' }, { status: 400 });
    }

    // Upload to vendor-invoices bucket
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('vendor-invoices')
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload invoice' }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('vendor-invoices')
      .getPublicUrl(filename);

    const invoiceUrl = urlData.publicUrl;
    const invoicePath = uploadData.path;

    // Get vendor info + template
    const { data: vendor } = await supabaseAdmin
      .from('vendors')
      .select('id, name, invoice_template_url')
      .eq('id', vendorId)
      .single();

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Build Claude vision messages
    const imageContent: Array<{ type: string; source?: { type: string; media_type: string; data: string }; text?: string }> = [];

    // If vendor has a template, include it for reference
    if (vendor.invoice_template_url) {
      try {
        const templateRes = await fetch(vendor.invoice_template_url);
        const templateBuf = await templateRes.arrayBuffer();
        const templateBase64 = Buffer.from(templateBuf).toString('base64');
        const templateType = templateRes.headers.get('content-type') || 'image/jpeg';

        imageContent.push({
          type: 'text',
          text: 'Here is a template/sample invoice from this vendor for reference on the layout:'
        });
        imageContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: templateType,
            data: templateBase64
          }
        });
      } catch {
        // Template fetch failed, proceed without it
      }
    }

    // Add the actual invoice image
    const invoiceBase64 = buffer.toString('base64');

    // For PDF, we can't send as image — use a different approach
    if (file.type === 'application/pdf') {
      imageContent.push({
        type: 'text',
        text: 'The invoice is a PDF. I\'ll provide it as a document. Please extract the line items.'
      });
      imageContent.push({
        type: 'document' as string,
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: invoiceBase64
        }
      });
    } else {
      imageContent.push({
        type: 'text',
        text: 'Here is the invoice to extract line items from:'
      });
      imageContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: file.type,
          data: invoiceBase64
        }
      });
    }

    imageContent.push({
      type: 'text',
      text: `Extract all line items from this invoice. Return ONLY valid JSON with this exact structure, no markdown formatting:
{
  "items": [
    {
      "product_name": "Name of product",
      "quantity": 1,
      "unit": "kg or pieces or L or null",
      "unit_price": 10.00,
      "total_price": 10.00
    }
  ],
  "invoice_date": "YYYY-MM-DD",
  "total_amount": 100.00
}

Important:
- Extract ALL line items visible on the invoice
- Use the exact product names as written on the invoice
- If quantities/prices are unclear, use your best estimate
- invoice_date should be in YYYY-MM-DD format
- total_amount should be the grand total
- All amounts should be numeric (no currency symbols)
- Return ONLY the JSON object, nothing else`
    });

    // Call Claude API
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: imageContent
          }
        ]
      })
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error('Claude API error:', errText);
      return NextResponse.json({ error: 'AI extraction failed' }, { status: 500 });
    }

    const claudeData = await claudeRes.json();
    const responseText = claudeData.content?.[0]?.text || '';

    // Parse the JSON from Claude's response
    let extraction: { items: ExtractedItem[]; invoice_date: string; total_amount: number };
    try {
      // Try to extract JSON from the response (handle potential markdown wrapping)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      extraction = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('Parse error:', parseErr, 'Response:', responseText);
      return NextResponse.json({
        error: 'Failed to parse AI extraction',
        raw: responseText,
        invoice_url: invoiceUrl,
        invoice_path: invoicePath
      }, { status: 422 });
    }

    // Fuzzy-match extracted items against inventory for this vendor
    const { data: inventoryItems } = await supabaseAdmin
      .from('inventory_items')
      .select('id, name')
      .eq('vendor_id', vendorId);

    const itemsWithMatches = (extraction.items || []).map((item: ExtractedItem) => {
      let bestMatch: InventoryMatch | null = null;

      if (inventoryItems && inventoryItems.length > 0) {
        for (const inv of inventoryItems) {
          const score = tokenOverlapScore(item.product_name, inv.name);
          if (score > 0.5 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { id: inv.id, name: inv.name, score };
          }
        }
      }

      return {
        ...item,
        matched_inventory_id: bestMatch?.id || null,
        matched_inventory_name: bestMatch?.name || null,
        match_score: bestMatch?.score || 0
      };
    });

    return NextResponse.json({
      success: true,
      invoice_url: invoiceUrl,
      invoice_path: invoicePath,
      vendor_id: vendorId,
      vendor_name: vendor.name,
      extraction: {
        items: itemsWithMatches,
        invoice_date: extraction.invoice_date || new Date().toISOString().split('T')[0],
        total_amount: extraction.total_amount || 0
      },
      raw_extraction: extraction,
      inventory_items: inventoryItems || []
    });
  } catch (error) {
    console.error('Invoice scan error:', error);
    return NextResponse.json({ error: 'Invoice scan failed' }, { status: 500 });
  }
}
