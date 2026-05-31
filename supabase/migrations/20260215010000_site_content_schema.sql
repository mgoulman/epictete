-- Site Content: editable landing page content stored as bilingual JSON per section
CREATE TABLE IF NOT EXISTS site_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section TEXT NOT NULL UNIQUE,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- RLS
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Public read (landing page is unauthenticated)
CREATE POLICY "site_content_public_read"
  ON site_content FOR SELECT
  USING (true);

-- Authenticated write
CREATE POLICY "site_content_auth_write"
  ON site_content FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed 7 section rows with empty content (= use i18n fallback)
INSERT INTO site_content (section, content) VALUES
  ('hero', '{}'::jsonb),
  ('philosophy', '{}'::jsonb),
  ('gallery', '{}'::jsonb),
  ('featuredDishes', '{}'::jsonb),
  ('testimonials', '{}'::jsonb),
  ('location', '{}'::jsonb),
  ('cta', '{}'::jsonb)
ON CONFLICT (section) DO NOTHING;
