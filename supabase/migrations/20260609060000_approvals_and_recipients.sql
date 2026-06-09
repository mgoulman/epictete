-- Notification recipients + configurable approval workflow
-- ------------------------------------------------------------------------

-- 1) Recipient targeting on notifications (role and/or specific users).
--    NULL on both = fall back to required_permission visibility.
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_roles text[];
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_users uuid[];

-- Seed default recipients into the existing alert settings.
UPDATE public.notification_settings
  SET config = config || '{"recipient_roles":["manager","finance","cuisine"],"recipient_users":[]}'::jsonb
  WHERE type = 'low_stock';
UPDATE public.notification_settings
  SET config = config || '{"recipient_roles":["manager"],"recipient_users":[]}'::jsonb
  WHERE type = 'new_reservation';
UPDATE public.notification_settings
  SET config = config || '{"recipient_roles":["manager","finance"],"recipient_users":[]}'::jsonb
  WHERE type = 'daily_summary';

-- 2) Approval rules — one row per module.
CREATE TABLE IF NOT EXISTS public.approval_rules (
  module          text PRIMARY KEY,        -- inventory | menu | finance
  enabled         boolean DEFAULT false,
  requester_roles text[] DEFAULT '{}',     -- roles whose writes need approval
  approver_roles  text[] DEFAULT '{}',     -- roles allowed to approve
  updated_at      timestamptz DEFAULT now()
);

INSERT INTO public.approval_rules (module, enabled, requester_roles, approver_roles) VALUES
  ('inventory', false, '{intern}'::text[],  '{manager,admin}'::text[]),
  ('menu',      false, '{}'::text[],         '{manager,admin}'::text[]),
  ('finance',   false, '{}'::text[],         '{manager,admin}'::text[])
ON CONFLICT (module) DO NOTHING;

-- 3) Pending change requests.
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module            text NOT NULL,
  action            text NOT NULL,           -- db_query | inventory_daily_purchase
  payload           jsonb NOT NULL,          -- enough to replay the write
  summary           text,
  requested_by      uuid,
  requested_by_name text,
  status            text DEFAULT 'pending',  -- pending | approved | rejected
  review_note       text,
  reviewed_by       uuid,
  reviewed_by_name  text,
  created_at        timestamptz DEFAULT now(),
  reviewed_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status     ON public.approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_created_at ON public.approval_requests(created_at DESC);
