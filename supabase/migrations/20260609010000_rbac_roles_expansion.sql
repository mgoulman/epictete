-- RBAC Roles & Permissions Expansion
-- ------------------------------------------------------------------------
-- Expands the original 4-role RBAC seed to the canonical 7-role model and
-- adds permissions for every backoffice resource (recipes, salle, inventory,
-- reports, personnel, transport). This seed is authoritative and idempotent:
-- it can be re-run safely and rebuilds the role_permissions matrix for the
-- seven managed roles to match lib/types/auth.ts (ROLE_PERMISSIONS).
--
-- Roles: admin, manager, finance, marketing, cuisine, rh, serveur
-- (legacy 'regular' is kept as a zero-access fallback; legacy 'waiter'
--  is migrated to 'serveur'.)

-- ============================================
-- 1. ROLES
-- ============================================
INSERT INTO public.roles (name, display_name, description, is_system) VALUES
  ('admin',     'Administrateur',     'Accès complet à tout le système',                         true),
  ('manager',   'Manager',            'Toutes les opérations sauf gestion des utilisateurs',     true),
  ('finance',   'Finance',            'Finances, achats/stock, inventaire et rapports',          true),
  ('marketing', 'Marketing',          'Marketing, documents et campagnes',                       true),
  ('cuisine',   'Cuisine',            'Menu, fiches techniques et consultation du stock',        true),
  ('rh',        'Ressources Humaines','Personnel et transport',                                  true),
  ('serveur',   'Serveur',            'Service en salle',                                        true)
ON CONFLICT (name) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      description  = EXCLUDED.description,
      is_system    = EXCLUDED.is_system;

-- ============================================
-- 2. PERMISSIONS (new resources)
-- ============================================
INSERT INTO public.permissions (name, resource, action, description) VALUES
  ('menu.read',        'menu',      'read',   'Voir les articles et catégories du menu'),
  ('menu.write',       'menu',      'write',  'Créer et modifier les articles du menu'),
  ('menu.delete',      'menu',      'delete', 'Supprimer les articles du menu'),
  ('recipes.read',     'recipes',   'read',   'Voir les fiches techniques'),
  ('recipes.write',    'recipes',   'write',  'Créer et modifier les fiches techniques'),
  ('salle.read',       'salle',     'read',   'Voir le plan de salle et le service'),
  ('salle.write',      'salle',     'write',  'Modifier le plan de salle'),
  ('salle.serve',      'salle',     'serve',  'Gérer le service en salle (commandes, tables)'),
  ('finance.read',     'finance',   'read',   'Voir les données financières'),
  ('finance.write',    'finance',   'write',  'Créer et modifier les données financières'),
  ('inventory.read',   'inventory', 'read',   'Voir le stock et les achats'),
  ('inventory.write',  'inventory', 'write',  'Gérer le stock et les achats'),
  ('reports.read',     'reports',   'read',   'Voir les rapports'),
  ('reports.write',    'reports',   'write',  'Créer et modifier les rapports'),
  ('personnel.read',   'personnel', 'read',   'Voir le personnel et les plannings'),
  ('personnel.write',  'personnel', 'write',  'Gérer le personnel et les plannings'),
  ('transport.read',   'transport', 'read',   'Voir le transport et les trajets'),
  ('transport.write',  'transport', 'write',  'Gérer le transport et les trajets'),
  ('marketing.read',   'marketing', 'read',   'Voir les documents marketing'),
  ('marketing.write',  'marketing', 'write',  'Modifier les supports marketing'),
  ('users.read',       'users',     'read',   'Voir la liste des utilisateurs'),
  ('users.write',      'users',     'write',  'Créer et modifier les utilisateurs'),
  ('users.delete',     'users',     'delete', 'Supprimer les utilisateurs'),
  ('users.manage',     'users',     'manage', 'Gestion complète incluant les rôles'),
  ('audit.read',       'audit',     'read',   'Voir les journaux d''audit'),
  ('settings.read',    'settings',  'read',   'Voir les paramètres système'),
  ('settings.write',   'settings',  'write',  'Modifier les paramètres système')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 3. MIGRATE LEGACY ASSIGNMENTS (waiter -> serveur)
-- ============================================
UPDATE public.profiles
SET role_id = (SELECT id FROM public.roles WHERE name = 'serveur')
WHERE role_id = (SELECT id FROM public.roles WHERE name = 'waiter');

-- ============================================
-- 4. REBUILD role_permissions FOR MANAGED ROLES
-- ============================================
-- Clear existing grants for the seven managed roles, then re-seed from the
-- canonical matrix so this migration is the source of truth.
DELETE FROM public.role_permissions
WHERE role_id IN (
  SELECT id FROM public.roles
  WHERE name IN ('admin','manager','finance','marketing','cuisine','rh','serveur')
);

-- Admin: every permission
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r CROSS JOIN public.permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- All other roles: explicit (role, permission) pairs
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM (VALUES
  -- manager: all operations except user management / system writes
  ('manager','menu.read'), ('manager','menu.write'), ('manager','menu.delete'),
  ('manager','recipes.read'), ('manager','recipes.write'),
  ('manager','salle.read'), ('manager','salle.write'), ('manager','salle.serve'),
  ('manager','finance.read'), ('manager','finance.write'),
  ('manager','inventory.read'), ('manager','inventory.write'),
  ('manager','reports.read'), ('manager','reports.write'),
  ('manager','personnel.read'), ('manager','personnel.write'),
  ('manager','transport.read'), ('manager','transport.write'),
  ('manager','marketing.read'), ('manager','marketing.write'),
  ('manager','users.read'),
  ('manager','audit.read'),
  ('manager','settings.read'),
  -- finance / comptable
  ('finance','finance.read'), ('finance','finance.write'),
  ('finance','inventory.read'), ('finance','inventory.write'),
  ('finance','reports.read'), ('finance','reports.write'),
  ('finance','menu.read'),
  -- marketing
  ('marketing','marketing.read'), ('marketing','marketing.write'),
  ('marketing','menu.read'),
  -- cuisine / chef
  ('cuisine','menu.read'), ('cuisine','menu.write'),
  ('cuisine','recipes.read'), ('cuisine','recipes.write'),
  ('cuisine','inventory.read'),
  -- rh / personnel
  ('rh','personnel.read'), ('rh','personnel.write'),
  ('rh','transport.read'), ('rh','transport.write'),
  ('rh','users.read'),
  -- serveur
  ('serveur','salle.read'), ('serveur','salle.serve')
) AS m(role_name, perm_name)
JOIN public.roles r ON r.name = m.role_name
JOIN public.permissions p ON p.name = m.perm_name
ON CONFLICT (role_id, permission_id) DO NOTHING;
