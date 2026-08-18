-- SaaS DB — 0004 analytics events (tenant/branch-scoped funnel/usage metrics).
-- audit_logs is CRUD-diff shaped; this is the activation/retention funnel table.
-- North-star activation event: first Feuille de Caisse saved.

create table if not exists analytics_events (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  branch_id  uuid references branches(id) on delete set null,
  user_id    uuid references users(id) on delete set null,
  event      text not null,
  props      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_tenant_idx on analytics_events(tenant_id, created_at);
create index if not exists analytics_events_event_idx on analytics_events(event);

alter table analytics_events enable row level security;
alter table analytics_events force row level security;
create policy analytics_iso on analytics_events
  using      (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
