-- Change reference_id from UUID to TEXT so it can store date strings
-- for daily_purchase and daily_usage references
ALTER TABLE public.inventory_movements ALTER COLUMN reference_id TYPE text;
