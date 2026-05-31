-- Add last_purchase_price to track the most recent price paid per item
-- cost_per_unit becomes the weighted average cost
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS last_purchase_price NUMERIC DEFAULT 0;

-- Initialize last_purchase_price from current cost_per_unit
UPDATE public.inventory_items
  SET last_purchase_price = cost_per_unit
  WHERE last_purchase_price = 0 AND cost_per_unit > 0;
