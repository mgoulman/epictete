-- Add the Intern (Stagiaire) role
-- ------------------------------------------------------------------------
-- Read-only observer across operations: menu, recipes, salle and inventory.
-- No write/delete anywhere; no finance, users, personnel, settings or audit.
-- Idempotent and re-runnable (rebuilds the intern grants from this seed).

INSERT INTO public.roles (name, display_name, description, is_system) VALUES
  ('intern', 'Stagiaire', 'Accès en lecture seule aux opérations (menu, fiches, salle, stock)', true)
ON CONFLICT (name) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      description  = EXCLUDED.description,
      is_system    = EXCLUDED.is_system;

-- Rebuild intern grants from the canonical matrix
DELETE FROM public.role_permissions
WHERE role_id = (SELECT id FROM public.roles WHERE name = 'intern');

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.name IN ('menu.read', 'recipes.read', 'salle.read', 'inventory.read')
WHERE r.name = 'intern'
ON CONFLICT (role_id, permission_id) DO NOTHING;
