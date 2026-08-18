-- SaaS DB — 0007 tenantize the 47 module tables.
-- Adds tenant_id (FK to tenants, ON DELETE CASCADE for clean offboarding) + a
-- nullable branch_id, indexes, and fail-closed RLS to every module table.
-- NOTE: this SaaS DB is fresh/empty, so tenant_id is set NOT NULL directly. For a
-- POPULATED DB you would add it nullable, backfill each row to its tenant, THEN
-- set NOT NULL — do not run this as-is against a DB that already has module rows.

do $$
declare
  t text;
  mods text[] := array[
    'approval_requests','approval_rules','attendance','cash_sheets','daily_entries','drivers','expenses',
    'floor_zones','inventory_categories','inventory_items','inventory_movements','invoices','lacaisse_daily',
    'lacaisse_sync_runs','menu_categories','menu_items','menus','misc_expenses','notification_settings',
    'notifications','payroll_entries','purchase_order_items','purchase_orders','recipe_ingredients','recipes',
    'salary_records','sales_cost_map','sales_imports','sales_items','salle_orders','salle_sessions','salle_tables',
    'site_content','staff_members','staff_schedules','staff_time_off','staff_types','table_orders','table_sessions',
    'tables','transport_trip_passengers','transport_trips','vehicles','vendor_invoice_items','vendor_invoices',
    'vendor_transactions','vendors'
  ];
begin
  foreach t in array mods loop
    execute format('alter table %I add column if not exists tenant_id uuid references tenants(id) on delete cascade', t);
    execute format('alter table %I add column if not exists branch_id uuid references branches(id) on delete set null', t);
    execute format('alter table %I alter column tenant_id set not null', t);
    execute format('create index if not exists %I on %I(tenant_id)', t || '_tenant_idx', t);
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format(
      'create policy tenant_iso on %I using (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid) with check (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)',
      t);
  end loop;
end $$;

-- Optional origin column on cash/stock entry tables (POS import later writes source='pos').
alter table cash_sheets         add column if not exists source text not null default 'manual';
alter table inventory_movements add column if not exists source text not null default 'manual';
alter table sales_items         add column if not exists source text not null default 'manual';
alter table daily_entries       add column if not exists source text not null default 'manual';

-- Ensure the app role can access the newly-columned tables (idempotent).
grant select, insert, update, delete on all tables in schema public to saas_app;
grant usage, select on all sequences in schema public to saas_app;
