-- Custom (user-defined) columns for the Feuille de Caisse.
-- Stored as a JSONB array of { title: string, items: [{ label, amount }] } on the
-- cash_sheets row, alongside the fixed paid_items / unpaid_items / paid_outside_items.
-- These are informational columns that print on the downloaded sheet; they do NOT
-- affect the cash totals (only paid_items feeds TOTAL DÉPENSE).
ALTER TABLE public.cash_sheets ADD COLUMN IF NOT EXISTS custom_columns JSONB DEFAULT '[]'::jsonb;
