-- Fix sales_items duplication: LaCaisse exports many lines with an empty time,
-- and NULLs are treated as DISTINCT by a unique index, so ON CONFLICT never
-- caught them and every daily sync re-inserted those rows (inflating CA ~3x+).
--
-- 1) Normalise the dedup-key columns to '' instead of NULL.
UPDATE sales_items SET sale_time     = '' WHERE sale_time IS NULL;
UPDATE sales_items SET ticket_number = '' WHERE ticket_number IS NULL;

-- 2) Make the unique index treat NULLs as equal, so no null key column can ever
--    defeat dedup again (covers sale_date too). Requires Postgres 15+.
DROP INDEX IF EXISTS idx_sales_items_unique;
CREATE UNIQUE INDEX idx_sales_items_unique
  ON sales_items (ticket_number, product_name, sale_date, sale_time, quantity) NULLS NOT DISTINCT;

-- Note: existing duplicate rows were removed in a one-time cleanup
-- (kept lowest id per logical line); a full snapshot was saved to
-- sales_items_bak_20260629 before deletion.
