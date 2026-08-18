-- Add vendor_id FK to inventory_items
ALTER TABLE inventory_items
  ADD COLUMN vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;

-- Backfill: set vendor_id where supplier text matches a vendor name
UPDATE inventory_items
SET vendor_id = v.id
FROM vendors v
WHERE inventory_items.supplier IS NOT NULL
  AND LOWER(TRIM(inventory_items.supplier)) = LOWER(TRIM(v.name))
  AND inventory_items.vendor_id IS NULL;
