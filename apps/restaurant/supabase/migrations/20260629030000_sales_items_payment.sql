-- Capture LaCaisse payment method ("Moyens de paiements") per line so Ventes can
-- be filtered by cash / card / mixed / other.
ALTER TABLE sales_items ADD COLUMN IF NOT EXISTS payment_method text;  -- raw, e.g. "Carte bancaire 254"
ALTER TABLE sales_items ADD COLUMN IF NOT EXISTS payment_type   text;  -- normalised: card | cash | mixed | other
CREATE INDEX IF NOT EXISTS idx_sales_items_payment_type ON sales_items (payment_type);
