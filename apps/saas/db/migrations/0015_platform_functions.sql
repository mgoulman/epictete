-- ─────────────────────────────────────────────────────────────────────────────
-- Prod hardening. In prod the app connects as the non-superuser `saas_app` role,
-- for which FORCE RLS returns 0 rows without an app.tenant_id. A few operations are
-- genuinely context-less (you can't know the tenant yet): resolving a login to its
-- tenant, looking an invite up by token, provisioning a brand-new tenant, and the
-- platform-admin cross-tenant list. These are exposed as SECURITY DEFINER functions
-- owned by a dedicated BYPASSRLS role and EXECUTE-granted to saas_app. Everything
-- else that already knows its tenant runs inside runWithTenant (RLS-scoped) instead.
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'saas_platform') then
    create role saas_platform nologin bypassrls;
  end if;
end $$;

-- SECURITY DEFINER runs as this role, so it needs table privileges (BYPASSRLS only
-- skips policies, not GRANT checks). It's nologin and reachable only via the functions below.
grant all on all tables in schema public to saas_platform;
alter default privileges in schema public grant all on tables to saas_platform;

-- Login → the user's first active membership (tenant, slug, role).
create or replace function plt_login(p_user uuid)
returns table(tenant_id uuid, slug text, role text)
language sql security definer set search_path = public as $$
  select m.tenant_id, t.slug, r.name
  from memberships m
  join tenants t on t.id = m.tenant_id
  left join roles r on r.id = m.role_id
  where m.user_id = p_user and m.is_active = true and t.status = 'active'
  order by m.created_at
  limit 1;
$$;
alter function plt_login(uuid) owner to saas_platform;

-- Invite by token (accept flow + accept page).
create or replace function plt_invite(p_token text)
returns table(id uuid, tenant_id uuid, tenant_name text, slug text, email text,
              role_id uuid, role text, status text, expired boolean, user_exists boolean)
language sql security definer set search_path = public as $$
  select i.id, i.tenant_id, t.name, t.slug, i.email, i.role_id, r.name, i.status,
         (i.expires_at < now()),
         exists (select 1 from users u where lower(u.email) = lower(i.email))
  from invitations i
  join tenants t on t.id = i.tenant_id
  left join roles r on r.id = i.role_id
  where i.token = p_token;
$$;
alter function plt_invite(text) owner to saas_platform;

-- Is there already a live (pending, unexpired) OWNER invite for this email? (provision dedupe)
create or replace function plt_pending_owner_invite(p_email text)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from invitations i join roles r on r.id = i.role_id
    where lower(i.email) = lower(p_email) and r.name = 'owner'
      and i.status = 'pending' and i.expires_at > now()
  );
$$;
alter function plt_pending_owner_invite(text) owner to saas_platform;

-- Provision a new tenant: unique slug from a base + tenant + default branch + owner invite.
create or replace function plt_provision(p_name text, p_base_slug text, p_city text,
                                         p_email text, p_role uuid, p_token text, p_by uuid)
returns table(tenant_id uuid, slug text)
language plpgsql security definer set search_path = public as $$
declare v_tenant uuid; v_slug text := p_base_slug; i int := 2;
begin
  while exists (select 1 from tenants t where t.slug = v_slug) loop
    v_slug := p_base_slug || '-' || i; i := i + 1;
  end loop;
  insert into tenants (slug, name, city, status) values (v_slug, p_name, p_city, 'active') returning id into v_tenant;
  insert into branches (tenant_id, name, is_default) values (v_tenant, 'Principal', true);
  insert into invitations (tenant_id, email, role_id, token, invited_by) values (v_tenant, p_email, p_role, p_token, p_by);
  return query select v_tenant, v_slug;
end $$;
alter function plt_provision(text,text,text,text,uuid,text,uuid) owner to saas_platform;

-- Platform-admin cross-tenant overview.
create or replace function plt_tenants_overview()
returns table(id uuid, name text, slug text, city text, status text, created_at timestamptz,
              members int, cash_sheets int, has_owner boolean)
language sql security definer set search_path = public as $$
  select t.id, t.name, t.slug, t.city, t.status, t.created_at,
    (select count(*)::int from memberships m where m.tenant_id = t.id and m.is_active),
    (select count(*)::int from cash_sheets c where c.tenant_id = t.id),
    exists (select 1 from memberships m join roles r on r.id = m.role_id
             where m.tenant_id = t.id and r.name = 'owner' and m.is_active)
  from tenants t
  order by t.created_at desc;
$$;
alter function plt_tenants_overview() owner to saas_platform;

grant execute on function
  plt_login(uuid), plt_invite(text), plt_pending_owner_invite(text),
  plt_provision(text,text,text,text,uuid,text,uuid), plt_tenants_overview()
  to saas_app;

-- Make sure the non-superuser app role can touch the global identity tables (no RLS on these).
grant select, insert, update on users, profiles, password_resets to saas_app;
-- And DML on every app table (RLS still gates which ROWS it sees) — covers the runWithTenant paths.
grant select, insert, update, delete on all tables in schema public to saas_app;
alter default privileges in schema public grant select, insert, update, delete on tables to saas_app;
