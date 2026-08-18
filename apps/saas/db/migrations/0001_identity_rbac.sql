-- SaaS DB — 0001 identity + RBAC catalog.
-- GLOBAL (not tenant-scoped): a user is one global identity that can belong to
-- many tenants via memberships; roles/permissions are a shared catalog.
-- Role is NO LONGER on profiles — it moves to memberships (per tenant). See 0002.

create extension if not exists pgcrypto;

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists profiles (
  id         uuid primary key references users(id) on delete cascade,
  email      text,
  full_name  text,
  avatar_url text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists roles (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid,  -- NULL = system role shared by all tenants; set = tenant-custom role
  name         text not null,
  display_name text not null,
  description  text,
  is_system    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
-- unique role name per scope (global scope uses the nil uuid)
create unique index if not exists roles_name_scope_uidx
  on roles (coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

create table if not exists permissions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  resource    text not null,
  action      text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists role_permissions (
  id            uuid primary key default gen_random_uuid(),
  role_id       uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (role_id, permission_id)
);
