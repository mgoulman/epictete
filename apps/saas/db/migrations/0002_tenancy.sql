-- SaaS DB — 0002 multi-tenant core.
-- Hierarchy: user -> membership -> tenant (= account = billing entity = RLS
-- isolation boundary) -> branch (= restaurant). tenant_id is the hard boundary;
-- branch is an in-tenant sub-partition, NOT a second RLS wall.
-- RLS pattern validated by Spike 1: FORCE RLS + NULLIF(current_setting)::uuid.

create table if not exists tenants (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  status     text not null default 'active' check (status in ('active','suspended','offboarding')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists branches (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  name       text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists branches_tenant_idx on branches(tenant_id);

create table if not exists memberships (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  role_id    uuid not null references roles(id),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);
create index if not exists memberships_tenant_idx on memberships(tenant_id);
create index if not exists memberships_user_idx on memberships(user_id);

-- ── RLS (isolation boundary = tenant) ──────────────────────────────────────
alter table tenants enable row level security;
alter table tenants force row level security;
create policy tenant_self on tenants
  using (id = nullif(current_setting('app.tenant_id', true), '')::uuid);

alter table branches enable row level security;
alter table branches force row level security;
create policy branch_iso on branches
  using      (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

alter table memberships enable row level security;
alter table memberships force row level security;
create policy membership_iso on memberships
  using      (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
