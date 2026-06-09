-- Salle floor-plan & service schema
-- ------------------------------------------------------------------------
-- The /api/salle, /api/salle/sessions and /api/salle/orders routes were
-- rewritten to use floor_zones / tables / table_sessions / table_orders, but
-- the matching schema was never created (the DB only had the legacy salle_*
-- tables, left untouched here). This creates the current schema.
--
-- FK constraint names are explicit and MUST match the `table!constraint(...)`
-- hints used in the route select() calls:
--   tables_assigned_waiter_id_fkey, table_sessions_table_id_fkey,
--   table_sessions_waiter_id_fkey, table_orders_menu_item_id_fkey
-- Note: menu_items.id is TEXT, so table_orders.menu_item_id is TEXT.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Floor zones ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.floor_zones (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── Tables (floor-plan positions) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tables (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id            uuid REFERENCES public.floor_zones(id) ON DELETE SET NULL,
  table_number       integer,
  seats              integer DEFAULT 4,
  shape              text    DEFAULT 'round',
  x                  numeric DEFAULT 50,
  y                  numeric DEFAULT 50,
  width              numeric DEFAULT 10,
  height             numeric DEFAULT 10,
  rotation           numeric DEFAULT 0,
  status             text    DEFAULT 'available',
  assigned_waiter_id uuid,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  CONSTRAINT tables_assigned_waiter_id_fkey FOREIGN KEY (assigned_waiter_id)
    REFERENCES public.staff_members(id) ON DELETE SET NULL
);

-- ── Table service sessions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.table_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id     uuid,
  waiter_id    uuid,
  guests_count integer DEFAULT 1,
  status       text    DEFAULT 'active',
  notes        text,
  total_amount numeric DEFAULT 0,
  opened_at    timestamptz DEFAULT now(),
  closed_at    timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  CONSTRAINT table_sessions_table_id_fkey FOREIGN KEY (table_id)
    REFERENCES public.tables(id) ON DELETE CASCADE,
  CONSTRAINT table_sessions_waiter_id_fkey FOREIGN KEY (waiter_id)
    REFERENCES public.staff_members(id) ON DELETE SET NULL
);

-- ── Orders placed within a session ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.table_orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid,
  menu_item_id text,
  quantity     numeric DEFAULT 1,
  unit_price   numeric DEFAULT 0,
  notes        text,
  status       text    DEFAULT 'ordered',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  CONSTRAINT table_orders_session_id_fkey FOREIGN KEY (session_id)
    REFERENCES public.table_sessions(id) ON DELETE CASCADE,
  CONSTRAINT table_orders_menu_item_id_fkey FOREIGN KEY (menu_item_id)
    REFERENCES public.menu_items(id) ON DELETE SET NULL
);

-- ── Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tables_zone_id            ON public.tables(zone_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_table_id   ON public.table_sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_status     ON public.table_sessions(status);
CREATE INDEX IF NOT EXISTS idx_table_orders_session_id   ON public.table_orders(session_id);

-- ── updated_at triggers ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_floor_zones_updated_at ON public.floor_zones;
CREATE TRIGGER update_floor_zones_updated_at BEFORE UPDATE ON public.floor_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_tables_updated_at ON public.tables;
CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON public.tables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_table_sessions_updated_at ON public.table_sessions;
CREATE TRIGGER update_table_sessions_updated_at BEFORE UPDATE ON public.table_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_table_orders_updated_at ON public.table_orders;
CREATE TRIGGER update_table_orders_updated_at BEFORE UPDATE ON public.table_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
