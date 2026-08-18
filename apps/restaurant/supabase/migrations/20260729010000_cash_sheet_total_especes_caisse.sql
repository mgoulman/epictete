-- Separate the manual register cash value from the calculated cash total.
-- total_especes_caisse = raw "Total Espèce Caisse" entered on the form.
-- total_especes = calculated "TOTAL ESPÈCES" = caisse + Glovo TTC Espèce.

ALTER TABLE public.cash_sheets
  ADD COLUMN IF NOT EXISTS total_especes_caisse NUMERIC;

UPDATE public.cash_sheets
SET total_especes_caisse = GREATEST(
  0,
  COALESCE(total_ca, 0)
    - COALESCE(total_cb, 0)
    - COALESCE(glovo_ttc_espece, 0)
    - COALESCE(glovo_ttc_online, 0)
)
WHERE total_especes_caisse IS NULL;

UPDATE public.cash_sheets
SET
  total_especes = COALESCE(total_especes_caisse, 0) + COALESCE(glovo_ttc_espece, 0),
  total_ca = COALESCE(total_cb, 0)
    + COALESCE(total_especes_caisse, 0)
    + COALESCE(glovo_ttc_espece, 0)
    + COALESCE(glovo_ttc_online, 0),
  reste_especes = COALESCE(total_especes_caisse, 0)
    + COALESCE(glovo_ttc_espece, 0)
    - COALESCE(total_depense, 0);

ALTER TABLE public.cash_sheets
  ALTER COLUMN total_especes_caisse SET DEFAULT 0,
  ALTER COLUMN total_especes_caisse SET NOT NULL;

-- The cash-sheet save also pre-fills the daily Suivi entry. Keep existing
-- synced rows aligned with the corrected cash-sheet semantics.
UPDATE public.daily_entries d
SET
  revenue_card = c.total_cb,
  revenue_cash = c.total_especes_caisse,
  glovo_ttc_espece = c.glovo_ttc_espece,
  glovo_ttc_online = c.glovo_ttc_online,
  expense_cash = c.total_depense,
  espece_reste = c.reste_especes,
  updated_at = NOW()
FROM public.cash_sheets c
WHERE d.entry_date = c.entry_date;
