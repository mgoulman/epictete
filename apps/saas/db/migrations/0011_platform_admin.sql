-- Platform (super) admins: cross-tenant operators for provisioning + cohort management.
-- They belong to NO tenant; identity is this flag on the global users table.
alter table users add column if not exists is_platform_admin boolean not null default false;
