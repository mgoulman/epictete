-- Create inventory_categories table (shared by inventory_items and vendors)
CREATE TABLE IF NOT EXISTS public.inventory_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Populate from existing inventory_items categories
INSERT INTO inventory_categories (name)
SELECT DISTINCT category FROM inventory_items WHERE category IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- Add category_id FK to inventory_items
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL;

-- Backfill inventory_items.category_id
UPDATE inventory_items i
SET category_id = c.id
FROM inventory_categories c
WHERE i.category = c.name AND i.category_id IS NULL;

-- Add category_id FK to vendors
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL;

-- Backfill vendors.category_id
UPDATE vendors v
SET category_id = c.id
FROM inventory_categories c
WHERE v.category = c.name AND v.category_id IS NULL;

-- RLS
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view inventory categories"
  ON public.inventory_categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can manage inventory categories"
  ON public.inventory_categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- updated_at trigger
DROP TRIGGER IF EXISTS update_inventory_categories_updated_at ON public.inventory_categories;
CREATE TRIGGER update_inventory_categories_updated_at
  BEFORE UPDATE ON public.inventory_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
