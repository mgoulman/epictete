-- R1 — Feuille de Caisse: user-defined non-cash payment sources (Virement, Chèque, …).
-- Each source: { name, amount, counts_as_cash }. When counts_as_cash is false the amount
-- is deducted from CA (like CB) when isolating cash-in-drawer; when true it stays in the
-- espèces bucket. Stored as JSONB so the shape can evolve without further migrations.
ALTER TABLE public.cash_sheets
  ADD COLUMN IF NOT EXISTS payment_sources JSONB DEFAULT '[]'::jsonb;
