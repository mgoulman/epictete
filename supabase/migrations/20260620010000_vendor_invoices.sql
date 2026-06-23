-- Vendor invoices: scanned/extracted supplier invoices + line items.
-- BACKFILL: these tables were created directly in Neon without a migration.
-- This file reproduces their live schema (introspected from the DB) so the
-- database can be rebuilt from version control. Used by app/api/invoices/route.ts.

CREATE TABLE IF NOT EXISTS public.vendor_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  invoice_url TEXT,
  invoice_path TEXT,
  invoice_date DATE,
  total_amount NUMERIC,
  status TEXT DEFAULT 'pending',
  vendor_transaction_id UUID REFERENCES public.vendor_transactions(id) ON DELETE SET NULL,
  raw_extraction JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vendor_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.vendor_invoices(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity NUMERIC DEFAULT 0,
  unit TEXT,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  matched_inventory_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_invoices_vendor_id ON public.vendor_invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_invoice_items_invoice_id ON public.vendor_invoice_items(invoice_id);

-- Enable RLS
ALTER TABLE public.vendor_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_invoice_items ENABLE ROW LEVEL SECURITY;

-- Permissive policies (same as other tables)
CREATE POLICY "Allow all for authenticated" ON public.vendor_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.vendor_invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
