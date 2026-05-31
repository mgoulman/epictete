-- Add pack_size to inventory_items for products bought in bulk packs
-- Default 1 means no pack (unit mode). E.g., eggs = 30, oil bottles in carton = 12
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS pack_size NUMERIC DEFAULT 1;
