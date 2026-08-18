-- SaaS DB — 0003 billing skeleton (day-1 shape, NO charging logic).
-- All billing tables are `billing_`-prefixed so they never collide with restaurant
-- module tables (e.g. the modules already have their own `invoices`).
-- Billing unit = the BRANCH (billing_subscription_items); billing entity = the TENANT
-- account. billing_payments.method is provider-agnostic (manual/CMI works day 1, no
-- rail hard-wired). ICE/RC on tenants for Moroccan invoicing.

alter table tenants
  add column if not exists ice           text,
  add column if not exists rc            text,
  add column if not exists billing_email text;

create table if not exists billing_plans (  -- GLOBAL catalog (not tenant-scoped)
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name       text not null,
  interval   text not null default 'month' check (interval in ('month','year')),
  currency   text not null default 'MAD',
  base_price numeric(12,2) not null default 0,
  features   jsonb not null default '{}'::jsonb,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists billing_subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  plan_id               uuid references billing_plans(id),
  status                text not null default 'pilot' check (status in ('pilot','trial','active','past_due','canceled')),
  trial_end             date,
  pilot_end             date,
  current_period_start  date,
  current_period_end    date,
  cancel_at             date,
  payment_provider_ref  text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists billing_subscriptions_tenant_idx on billing_subscriptions(tenant_id);

create table if not exists billing_subscription_items (  -- one item per BRANCH = the billing unit
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  subscription_id uuid not null references billing_subscriptions(id) on delete cascade,
  branch_id       uuid references branches(id) on delete cascade,
  unit_price      numeric(12,2) not null default 0,
  quantity        int not null default 1,
  created_at      timestamptz not null default now()
);
create index if not exists billing_subscription_items_tenant_idx on billing_subscription_items(tenant_id);

create table if not exists billing_invoices (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  subscription_id uuid references billing_subscriptions(id),
  period          text,
  currency        text not null default 'MAD',
  amount_due      numeric(12,2) not null default 0,
  amount_paid     numeric(12,2) not null default 0,
  status          text not null default 'draft' check (status in ('draft','open','paid','void','uncollectible')),
  issued_at       date,
  due_at          date,
  pdf_url         text,
  created_at      timestamptz not null default now()
);
create index if not exists billing_invoices_tenant_idx on billing_invoices(tenant_id);

create table if not exists billing_payments (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  invoice_id uuid references billing_invoices(id) on delete set null,
  method     text not null default 'manual' check (method in ('manual','virement','cheque','cmi','stripe','other')),
  amount     numeric(12,2) not null default 0,
  reference  text,
  paid_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists billing_payments_tenant_idx on billing_payments(tenant_id);

-- RLS on tenant-scoped billing tables (billing_plans stays a global catalog, no RLS)
do $$
declare t text;
begin
  foreach t in array array['billing_subscriptions','billing_subscription_items','billing_invoices','billing_payments'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format(
      'create policy %I on %I using (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid) with check (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)',
      t || '_iso', t);
  end loop;
end $$;
