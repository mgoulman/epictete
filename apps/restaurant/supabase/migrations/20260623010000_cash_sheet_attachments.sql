-- Attachments (scanned receipts / photos) linked to a fiche de caisse.
-- Stored as a JSONB array of { name, url, path, mime, size } on the cash_sheets row.
ALTER TABLE public.cash_sheets ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
