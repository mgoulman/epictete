-- ─────────────────────────────────────────────────────────────────────────────
-- Demo seed for local SaaS dev (epictete_saas_dev). Idempotent. Run as superuser
-- (RLS-bypassing) — it writes across tenant tables directly.
--   Login:  owner@demo.ma  /  demo1234
-- NEVER run against the live Neon DB.
-- ─────────────────────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;

-- Fixed IDs for idempotency
-- tenant 1111…  branch 2222…  user 3333…
begin;

-- Clean prior demo (tenant cascade drops its module rows + branch + membership)
delete from tenants   where id = '11111111-1111-1111-1111-111111111111';
delete from profiles  where id = '33333333-3333-3333-3333-333333333333';
delete from users     where id = '33333333-3333-3333-3333-333333333333';

-- System roles (global; NULL tenant_id)
insert into roles (name, display_name, is_system) values
  ('owner',   'Propriétaire',  true),
  ('manager', 'Manager',       true),
  ('cashier', 'Caissier',      true)
on conflict do nothing;

-- Tenant + default branch
insert into tenants (id, slug, name, status)
values ('11111111-1111-1111-1111-111111111111', 'le-gourmet', 'Le Gourmet', 'active');

insert into branches (id, tenant_id, name, is_default)
values ('22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111', 'Gueliz', true);

-- Owner user + profile + membership
insert into users (id, email, password_hash)
values ('33333333-3333-3333-3333-333333333333', 'owner@demo.ma',
        crypt('demo1234', gen_salt('bf')));

insert into profiles (id, email, full_name)
values ('33333333-3333-3333-3333-333333333333', 'owner@demo.ma', 'Yassine El Amrani');

insert into memberships (tenant_id, user_id, role_id)
select '11111111-1111-1111-1111-111111111111',
       '33333333-3333-3333-3333-333333333333', r.id
from roles r where r.name = 'owner' and r.tenant_id is null;

-- ── Module data (tenant + branch scoped) ────────────────────────────────────
-- 7 days of cash sheets (for the Caisse tile + 7-day trend)
insert into cash_sheets (tenant_id, branch_id, entry_date, total_ca, total_cb,
                         total_especes, total_depense, total_especes_caisse, reste_especes, manager_name)
select '11111111-1111-1111-1111-111111111111',
       '22222222-2222-2222-2222-222222222222',
       current_date - g,
       v, round(v*0.45), round(v*0.55), d, round(v*0.55) - d, round(v*0.55) - d, 'Yassine'
from (values (0, 8450, 1200), (1, 7320, 900), (2, 9110, 1500), (3, 6540, 700),
             (4, 10230, 2100), (5, 8890, 1300), (6, 7760, 1000)) as t(g, v, d);

-- Inventory (2 below the minimum → "Stock bas")
insert into inventory_items (tenant_id, name, category, quantity, unit, minimum_stock, cost_per_unit) values
  ('11111111-1111-1111-1111-111111111111', 'Farine T55',      'Sec',    4,  'sac',  10, 65),
  ('11111111-1111-1111-1111-111111111111', 'Huile d''olive',  'Sec',    2,  'bidon', 6, 180),
  ('11111111-1111-1111-1111-111111111111', 'Tomates',         'Frais', 25,  'kg',   10, 12),
  ('11111111-1111-1111-1111-111111111111', 'Poulet',          'Frais', 40,  'kg',   15, 48),
  ('11111111-1111-1111-1111-111111111111', 'Fromage',         'Frais', 18,  'kg',    8, 90);

-- Staff + today's attendance (3 of 4 present)
insert into staff_members (id, tenant_id, first_name, last_name, "position", is_active) values
  ('44444444-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Karim',  'Benali',  'Chef',     true),
  ('44444444-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Salma',  'Idrissi', 'Serveuse', true),
  ('44444444-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Omar',   'Tazi',    'Commis',   true),
  ('44444444-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Nadia',  'Alaoui',  'Caisse',   true);

insert into attendance (tenant_id, staff_id, date, status) values
  ('11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000001', current_date, 'present'),
  ('11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000002', current_date, 'present'),
  ('11111111-1111-1111-1111-111111111111', '44444444-0000-0000-0000-000000000003', current_date, 'present');

-- Vendors + transactions (net "Dû aux fournisseurs")
insert into vendors (id, tenant_id, name, is_active) values
  ('55555555-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Métro Maroc', true),
  ('55555555-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Primeur Gueliz', true);

insert into vendor_transactions (tenant_id, vendor_id, type, amount, date) values
  ('11111111-1111-1111-1111-111111111111', '55555555-0000-0000-0000-000000000001', 'debt',    5400, current_date - 3),
  ('11111111-1111-1111-1111-111111111111', '55555555-0000-0000-0000-000000000001', 'payment', 3000, current_date - 1),
  ('11111111-1111-1111-1111-111111111111', '55555555-0000-0000-0000-000000000002', 'debt',    1850, current_date - 2);

commit;

select 'Seeded tenant Le Gourmet — login owner@demo.ma / demo1234' as done;
