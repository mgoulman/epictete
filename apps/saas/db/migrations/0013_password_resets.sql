-- Password reset tokens. Global identity table (no tenant RLS) — created by an owner
-- (for a member) or a platform admin (for an owner), shared as a one-time link since
-- there is no email infra yet. Accessed platform-level via unsafeQuery.
create table if not exists password_resets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  token      text not null unique,
  expires_at timestamptz not null default (now() + interval '2 days'),
  used_at    timestamptz,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists password_resets_token_idx on password_resets(token);
grant select, insert, update on password_resets to saas_app;
