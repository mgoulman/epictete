-- Local PostgreSQL schema for Epictete Restaurant
-- Replaces Supabase hosted database

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Auth (replaces Supabase Auth) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RBAC ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role_id UUID REFERENCES roles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
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

-- ─── Menu ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_fr TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_fr TEXT,
  description TEXT,
  description_fr TEXT,
  price NUMERIC DEFAULT 0,
  category_id UUID REFERENCES menu_categories(id),
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  allergens TEXT[],
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  is_active BOOLEAN DEFAULT true,
  items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Recipes ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  portions INTEGER DEFAULT 1,
  preparation_time INTEGER,
  cooking_time INTEGER,
  instructions TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  inventory_item_id UUID,
  ingredient_name TEXT NOT NULL,
  quantity NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'g',
  unit_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Inventory ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  category TEXT,
  category_id UUID REFERENCES inventory_categories(id),
  is_active BOOLEAN DEFAULT true,
  invoice_template_url TEXT,
  invoice_template_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  category_id UUID REFERENCES inventory_categories(id),
  quantity NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'pieces',
  minimum_stock NUMERIC DEFAULT 0,
  cost_per_unit NUMERIC DEFAULT 0,
  last_purchase_price NUMERIC DEFAULT 0,
  pack_size NUMERIC DEFAULT 1,
  supplier TEXT,
  vendor_id UUID REFERENCES vendors(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FK for recipe_ingredients after inventory_items exists
ALTER TABLE recipe_ingredients
  DROP CONSTRAINT IF EXISTS recipe_ingredients_inventory_item_id_fkey;
ALTER TABLE recipe_ingredients
  ADD CONSTRAINT recipe_ingredients_inventory_item_id_fkey
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS vendor_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('debt', 'payment')),
  amount NUMERIC NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,
  quantity_change NUMERIC(12,3) DEFAULT 0,
  quantity_before NUMERIC(12,3) DEFAULT 0,
  quantity_after NUMERIC(12,3) DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  reference_type TEXT,
  reference_id TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Purchase Orders ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'received', 'cancelled')),
  notes TEXT,
  total_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  created_by UUID REFERENCES users(id),
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  received_quantity NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Financial Tracking ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE UNIQUE NOT NULL,
  revenue_card NUMERIC DEFAULT 0,
  revenue_cash NUMERIC DEFAULT 0,
  revenue_transfer NUMERIC DEFAULT 0,
  total_revenue NUMERIC GENERATED ALWAYS AS (revenue_card + revenue_cash + revenue_transfer) STORED,
  expense_cash NUMERIC DEFAULT 0,
  expense_card_pro NUMERIC DEFAULT 0,
  expense_tpe NUMERIC DEFAULT 0,
  total_expenses NUMERIC GENERATED ALWAYS AS (expense_cash + expense_card_pro + expense_tpe) STORED,
  withdrawal_pro NUMERIC DEFAULT 0,
  withdrawal_perso NUMERIC DEFAULT 0,
  total_withdrawals NUMERIC GENERATED ALWAYS AS (withdrawal_pro + withdrawal_perso) STORED,
  solde_theorique NUMERIC GENERATED ALWAYS AS (
    (revenue_card + revenue_cash + revenue_transfer)
    - (expense_cash + expense_card_pro + expense_tpe)
    - (withdrawal_pro + withdrawal_perso)
  ) STORED,
  observations TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'locked')),
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card_pro', 'tpe')),
  category TEXT DEFAULT 'other' CHECK (category IN (
    'vendor_order', 'market_purchase', 'utilities', 'equipment',
    'cleaning', 'transport', 'maintenance', 'salary_advance', 'other'
  )),
  description TEXT,
  vendor_id UUID REFERENCES vendors(id),
  vendor_transaction_id UUID REFERENCES vendor_transactions(id),
  daily_entry_id UUID REFERENCES daily_entries(id),
  receipt_url TEXT,
  receipt_path TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Sales ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sales_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT,
  family TEXT,
  category TEXT,
  product_name TEXT NOT NULL,
  sub_product TEXT,
  quantity NUMERIC DEFAULT 1,
  catalog_price NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  dine_in BOOLEAN DEFAULT true,
  sale_date DATE NOT NULL,
  sale_time TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT,
  records_count INTEGER DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  date_range_start DATE,
  date_range_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Staff / Personnel ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staff_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#606338',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  staff_type_id UUID REFERENCES staff_types(id),
  department TEXT DEFAULT 'cuisine',
  hourly_rate NUMERIC DEFAULT 0,
  contract_type TEXT DEFAULT 'CDI',
  hire_date DATE,
  is_active BOOLEAN DEFAULT true,
  schedule_type TEXT DEFAULT 'weekly',
  schedule_config JSONB,
  transport_pickup TEXT,
  transport_dropoff TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  is_day_off BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type TEXT DEFAULT 'vacation',
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Transport ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  license_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plate_number TEXT,
  capacity INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transport_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  trip_type TEXT NOT NULL CHECK (trip_type IN ('pickup', 'dropoff')),
  scheduled_time TEXT,
  driver_id UUID REFERENCES drivers(id),
  vehicle_id UUID REFERENCES vehicles(id),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transport_trip_passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES transport_trips(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Salle ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS salle_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INTEGER NOT NULL,
  capacity INTEGER DEFAULT 4,
  zone TEXT DEFAULT 'main',
  x NUMERIC DEFAULT 0,
  y NUMERIC DEFAULT 0,
  width NUMERIC DEFAULT 80,
  height NUMERIC DEFAULT 80,
  shape TEXT DEFAULT 'rectangle',
  rotation NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salle_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES salle_tables(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'occupied' CHECK (status IN ('occupied', 'ordering', 'served', 'billing', 'closed')),
  guests INTEGER DEFAULT 1,
  waiter_id UUID REFERENCES users(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salle_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES salle_sessions(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Site Content ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT UNIQUE NOT NULL,
  content JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- ─── Invoices ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id),
  invoice_number TEXT,
  invoice_date DATE,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  file_url TEXT,
  file_path TEXT,
  items JSONB DEFAULT '[]',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Seed default RBAC data ────────────────────────────────────────────────

INSERT INTO roles (name, display_name, description, is_system) VALUES
  ('admin', 'Administrator', 'Full system access', true),
  ('finance', 'Finance', 'Financial operations', true),
  ('marketing', 'Marketing', 'Marketing operations', true),
  ('regular', 'Regular', 'Basic access', true),
  ('waiter', 'Waiter', 'Table service', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, resource, action) VALUES
  ('menu.read', 'menu', 'read'),
  ('menu.write', 'menu', 'write'),
  ('menu.delete', 'menu', 'delete'),
  ('users.read', 'users', 'read'),
  ('users.write', 'users', 'write'),
  ('users.delete', 'users', 'delete'),
  ('users.manage', 'users', 'manage'),
  ('marketing.read', 'marketing', 'read'),
  ('marketing.write', 'marketing', 'write'),
  ('finance.read', 'finance', 'read'),
  ('finance.write', 'finance', 'write'),
  ('audit.read', 'audit', 'read'),
  ('settings.read', 'settings', 'read'),
  ('settings.write', 'settings', 'write'),
  ('salle.read', 'salle', 'read'),
  ('salle.write', 'salle', 'write'),
  ('salle.serve', 'salle', 'serve')
ON CONFLICT (name) DO NOTHING;

-- Give admin all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Give finance role finance permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'finance' AND p.name IN ('finance.read', 'finance.write')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Create default admin user (password: slowbob)
INSERT INTO users (id, email, password_hash) VALUES
  (gen_random_uuid(), 'admin@epictete.ma', crypt('slowbob', gen_salt('bf')))
ON CONFLICT (email) DO NOTHING;

-- Create admin profile
INSERT INTO profiles (id, email, full_name, role_id, is_active)
SELECT u.id, u.email, 'Admin', r.id, true
FROM users u, roles r
WHERE u.email = 'admin@epictete.ma' AND r.name = 'admin'
ON CONFLICT (id) DO NOTHING;
