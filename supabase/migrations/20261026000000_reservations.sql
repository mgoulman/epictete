-- Website reservations (persisted source of truth; also pushed to Odoo).
-- Each row is one reservation submitted on the Epictete landing page.
CREATE TABLE IF NOT EXISTS public.reservations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  phone            text NOT NULL,
  email            text,
  res_date         date NOT NULL,
  res_time         text NOT NULL,            -- "HH:MM"
  adults           integer NOT NULL DEFAULT 1,
  children         integer NOT NULL DEFAULT 0,
  baby_chairs      integer NOT NULL DEFAULT 0,
  special_requests text,
  source           text NOT NULL DEFAULT 'site web',
  status           text NOT NULL DEFAULT 'nouveau',
  odoo_pushed      boolean NOT NULL DEFAULT false,  -- did the Odoo push succeed?
  odoo_id          integer,                          -- id of the record in Odoo
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservations_res_date ON public.reservations(res_date);
CREATE INDEX IF NOT EXISTS idx_reservations_created_at ON public.reservations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservations_not_pushed ON public.reservations(odoo_pushed) WHERE odoo_pushed = false;
