-- The lacaisse sync now MIRRORS the POS per day (delete + re-insert the day's
-- lines) instead of append-with-ON-CONFLICT, so sales_items is an exact copy of
-- LaCaisse and SUM(selling_price) matches CA réalisé. A unique key would wrongly
-- collapse legitimately-identical lines, so drop it and keep a plain index for
-- the per-day delete.
DROP INDEX IF EXISTS idx_sales_items_unique;
CREATE INDEX IF NOT EXISTS idx_sales_items_source_day ON sales_items (import_source, sale_date);
