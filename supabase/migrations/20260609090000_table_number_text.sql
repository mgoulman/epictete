-- The floor-plan editor uses string table labels ("T1", "T2", ...), but the
-- tables.table_number column was created as integer, so inserts failed.
-- Change it to text to match the application.
ALTER TABLE public.tables
  ALTER COLUMN table_number TYPE text USING table_number::text;
