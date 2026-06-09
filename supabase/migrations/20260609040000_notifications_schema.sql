-- Notifications & alerts schema
-- ------------------------------------------------------------------------
-- In-app notification system: a notifications feed (shown in the header bell)
-- plus per-type configuration. Alerts are generated for low stock, new
-- reservations and a daily sales summary. dedup_key keeps generators
-- idempotent (e.g. one active low-stock alert per product).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.notifications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type                text NOT NULL,                 -- low_stock | new_reservation | daily_summary
  title               text NOT NULL,
  message             text,
  severity            text DEFAULT 'info',           -- info | warning | success
  link                text,                          -- optional in-app href
  required_permission text,                          -- visibility gate; null = all authenticated
  dedup_key           text UNIQUE,                   -- prevents duplicate generation
  is_read             boolean DEFAULT false,
  created_at          timestamptz DEFAULT now(),
  read_at             timestamptz
);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read    ON public.notifications(is_read);

-- Per-type configuration (org-wide; channel is in-app for now).
CREATE TABLE IF NOT EXISTS public.notification_settings (
  type       text PRIMARY KEY,
  enabled    boolean DEFAULT true,
  config     jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.notification_settings (type, enabled, config) VALUES
  ('low_stock',       true, '{"only_with_threshold": true}'::jsonb),
  ('new_reservation', true, '{}'::jsonb),
  ('daily_summary',   true, '{}'::jsonb)
ON CONFLICT (type) DO NOTHING;
