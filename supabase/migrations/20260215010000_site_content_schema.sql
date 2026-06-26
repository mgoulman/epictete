-- Site Content: editable landing page content stored as bilingual JSON per section
CREATE TABLE IF NOT EXISTS site_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section TEXT NOT NULL UNIQUE,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

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
