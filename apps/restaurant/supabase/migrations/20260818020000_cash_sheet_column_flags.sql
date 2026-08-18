-- Per-fixed-column flags for the Feuille de Caisse (PAYÉ / NON PAYÉ / PAYÉ HORS CAISSE):
-- { "<column_key>": { "count_as_depense": bool, "hidden": bool } }
-- Lets the three built-in columns be counted in TOTAL DÉPENSE and/or removed,
-- mirroring the options custom columns already have.
ALTER TABLE public.cash_sheets
  ADD COLUMN IF NOT EXISTS column_flags JSONB DEFAULT '{}'::jsonb;
