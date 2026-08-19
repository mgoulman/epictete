-- ─────────────────────────────────────────────────────────────────────────────
-- Team invitations (link-based: the owner shares the accept link manually; email
-- delivery is a later add). Tenant-scoped + RLS. Also adds tenants.city for the
-- restaurant profile.
-- ─────────────────────────────────────────────────────────────────────────────

alter table tenants add column if not exists city text;

create table if not exists invitations (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  email       text not null,
  role_id     uuid not null references roles(id),
  token       text not null unique,
  status      text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_by  uuid references users(id) on delete set null,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists invitations_tenant_idx on invitations(tenant_id);
create index if not exists invitations_token_idx  on invitations(token);
-- one live invite per (tenant, email); revoked/accepted rows don't block a re-invite
create unique index if not exists invitations_pending_uidx
  on invitations(tenant_id, lower(email)) where status = 'pending';

-- RLS: owners/managers see only their tenant's invites (via the app.tenant_id GUC).
-- NOTE: the accept flow looks an invite up BY TOKEN before any tenant context exists,
-- so the API uses unsafeQuery (platform-level). In dev the superuser bypasses RLS; for
-- prod this must become a SECURITY DEFINER lookup fn (same deferred hardening as sessions).
alter table invitations enable row level security;
alter table invitations force  row level security;
drop policy if exists invitations_isolation on invitations;
create policy invitations_isolation on invitations
  using      (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

grant select, insert, update, delete on invitations to saas_app;
