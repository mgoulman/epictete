-- RBAC Schema Migration for Epictete Restaurant
-- This migration creates the RBAC system and updates menu table RLS policies

-- ============================================
-- 1. ENABLE EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO public.roles (name, display_name, description, is_system) VALUES
  ('admin', 'Administrator', 'Full system access with all permissions', true),
  ('finance', 'Finance', 'Access to financial reports and data', true),
  ('marketing', 'Marketing', 'Access to marketing documents and campaigns', true),
  ('regular', 'Regular Staff', 'Basic access with view-only menu permissions', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 3. PERMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default permissions
INSERT INTO public.permissions (name, resource, action, description) VALUES
  -- Menu permissions
  ('menu.read', 'menu', 'read', 'View menu items and categories'),
  ('menu.write', 'menu', 'write', 'Create and edit menu items'),
  ('menu.delete', 'menu', 'delete', 'Delete menu items'),

  -- User management permissions
  ('users.read', 'users', 'read', 'View user list and profiles'),
  ('users.write', 'users', 'write', 'Create and edit users'),
  ('users.delete', 'users', 'delete', 'Delete users'),
  ('users.manage', 'users', 'manage', 'Full user management including role assignment'),

  -- Marketing permissions
  ('marketing.read', 'marketing', 'read', 'View marketing documents'),
  ('marketing.write', 'marketing', 'write', 'Edit marketing materials'),

  -- Finance permissions
  ('finance.read', 'finance', 'read', 'View financial reports'),
  ('finance.write', 'finance', 'write', 'Create and edit financial data'),

  -- Audit permissions
  ('audit.read', 'audit', 'read', 'View audit logs'),

  -- Settings permissions
  ('settings.read', 'settings', 'read', 'View system settings'),
  ('settings.write', 'settings', 'write', 'Modify system settings')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 4. ROLE_PERMISSIONS TABLE (Many-to-Many)
-- ============================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- Assign permissions to Admin role (all permissions)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Assign permissions to Finance role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'finance' AND p.name IN ('finance.read', 'finance.write', 'menu.read')
ON CONFLICT DO NOTHING;

-- Assign permissions to Marketing role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'marketing' AND p.name IN ('marketing.read', 'marketing.write', 'menu.read')
ON CONFLICT DO NOTHING;

-- Assign permissions to Regular role (view-only menu)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'regular' AND p.name = 'menu.read'
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. PROFILES TABLE (linked to public.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role_id UUID REFERENCES public.roles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. AUDIT_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  user_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================
-- 7. HELPER FUNCTIONS (Create before RLS policies)
-- ============================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION public.has_permission(user_id UUID, permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.role_permissions rp ON p.role_id = rp.role_id
    JOIN public.permissions perm ON rp.permission_id = perm.id
    WHERE p.id = user_id AND perm.name = permission_name
  );
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT r.name
  FROM public.profiles p
  JOIN public.roles r ON p.role_id = r.id
  WHERE p.id = user_id;
$$;

-- Function to get all user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id UUID)
RETURNS TABLE(permission_name TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT perm.name
  FROM public.profiles p
  JOIN public.role_permissions rp ON p.role_id = rp.role_id
  JOIN public.permissions perm ON rp.permission_id = perm.id
  WHERE p.id = user_id;
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = user_id AND r.name = 'admin'
  );
$$;

-- ============================================
-- 9. UPDATE MENU TABLES RLS POLICIES
-- ============================================

-- Drop existing permissive policies on menu_categories
DROP POLICY IF EXISTS "Allow public read" ON public.menu_categories;

-- Drop existing permissive policies on menu_items
DROP POLICY IF EXISTS "Allow public read" ON public.menu_items;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.menu_items;

-- Function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger to profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Apply updated_at trigger to roles table
DROP TRIGGER IF EXISTS update_roles_updated_at ON public.roles;
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
