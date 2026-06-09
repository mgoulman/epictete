-- Quick table reservations (name + time + party size) for the waiter view.
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS reserved_name   text;
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS reserved_time   text;
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS reserved_guests integer;

-- Let kitchen staff record stock usage (the Cuisine page) — grant cuisine inventory.write.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'cuisine' AND p.name = 'inventory.write'
ON CONFLICT (role_id, permission_id) DO NOTHING;
