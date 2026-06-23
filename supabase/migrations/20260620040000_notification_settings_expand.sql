-- Expand notification_settings with the new alert types and richer config
-- (channels + per-type thresholds/lead times). Mirrors lib/notification-types.ts.
-- Idempotent: only inserts missing rows / fills missing config keys.

INSERT INTO public.notification_settings (type, enabled, config) VALUES
  ('supplier_payment_due',  true, '{"recipient_roles":["manager","finance"],"channels":{"in_app":true,"push":true},"lead_time_days":3}'::jsonb),
  ('supplier_balance_high', true, '{"recipient_roles":["manager","finance"],"channels":{"in_app":true,"push":true},"threshold_mad":10000}'::jsonb),
  ('payroll_due',           true, '{"recipient_roles":["manager","finance"],"channels":{"in_app":true,"push":true},"day_of_month":28}'::jsonb),
  ('payslip_ready',         true, '{"channels":{"in_app":true,"push":true}}'::jsonb),
  ('contract_expiry',       true, '{"recipient_roles":["manager"],"channels":{"in_app":true,"push":true},"lead_time_days":30}'::jsonb)
ON CONFLICT (type) DO NOTHING;

-- Backfill a default channels object on any row missing it.
UPDATE public.notification_settings
  SET config = jsonb_set(config, '{channels}', '{"in_app":true,"push":true}'::jsonb, true)
  WHERE NOT (config ? 'channels');

-- Backfill default recipients for the original three types when unset.
UPDATE public.notification_settings
  SET config = config || '{"recipient_roles":["manager","finance","cuisine"]}'::jsonb
  WHERE type = 'low_stock' AND NOT (config ? 'recipient_roles');
UPDATE public.notification_settings
  SET config = config || '{"recipient_roles":["manager"]}'::jsonb
  WHERE type = 'new_reservation' AND NOT (config ? 'recipient_roles');
UPDATE public.notification_settings
  SET config = config || '{"recipient_roles":["manager","finance"]}'::jsonb
  WHERE type = 'daily_summary' AND NOT (config ? 'recipient_roles');
