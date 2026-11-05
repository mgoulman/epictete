-- Menu ↔ menu_items link table.
-- ------------------------------------------------------------------------
-- The /api/menus routes read/write public.menu_menu_items (the
-- `items:menu_menu_items(...)` relation in select(), plus insert()/update()),
-- but the table was never created by a migration — it only existed ad-hoc in
-- some environments, so `relation "menu_menu_items" does not exist` was thrown.
-- Columns mirror exactly what the routes use: id, menu_id, menu_item_id,
-- display_order, price_override. menu_items.id is TEXT, so menu_item_id is TEXT.
-- Additive only — creates a missing table the code already expects; no existing
-- table or behaviour is altered.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.menu_menu_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id        uuid NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  menu_item_id   text NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  display_order  integer NOT NULL DEFAULT 0,
  price_override numeric,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS menu_menu_items_menu_id_idx ON public.menu_menu_items(menu_id);
CREATE INDEX IF NOT EXISTS menu_menu_items_menu_item_id_idx ON public.menu_menu_items(menu_item_id);
