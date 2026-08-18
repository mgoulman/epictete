-- SaaS DB — 0008 make single-tenant UNIQUE constraints per-tenant.
-- These assumed one restaurant: two tenants must be able to share a value (e.g. a
-- cash sheet for the same date, a category named "Boissons"). tenants.slug stays
-- GLOBALLY unique — it is the tenant identifier.

alter table attendance           drop constraint attendance_staff_id_date_key,
  add constraint attendance_tenant_staff_date_key unique (tenant_id, staff_id, date);
alter table cash_sheets           drop constraint cash_sheets_entry_date_key,
  add constraint cash_sheets_tenant_entry_date_key unique (tenant_id, entry_date);
alter table daily_entries         drop constraint daily_entries_entry_date_key,
  add constraint daily_entries_tenant_entry_date_key unique (tenant_id, entry_date);
alter table inventory_categories  drop constraint inventory_categories_name_key,
  add constraint inventory_categories_tenant_name_key unique (tenant_id, name);
alter table notifications         drop constraint notifications_dedup_key_key,
  add constraint notifications_tenant_dedup_key unique (tenant_id, dedup_key);
alter table salary_records        drop constraint salary_records_staff_id_year_month_key,
  add constraint salary_records_tenant_staff_ym_key unique (tenant_id, staff_id, year, month);
alter table site_content          drop constraint site_content_section_key,
  add constraint site_content_tenant_section_key unique (tenant_id, section);

drop index if exists idx_sales_items_unique;
create unique index idx_sales_items_unique
  on sales_items (tenant_id, ticket_number, product_name, sale_date, sale_time, quantity);
