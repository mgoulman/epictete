-- SaaS DB — 0005 the non-superuser application role.
-- CRITICAL (Spike 1 finding): the app MUST connect as a non-superuser role, because
-- superusers and table owners bypass RLS. FORCE ROW LEVEL SECURITY (set per table)
-- makes RLS apply to the owner too, but never to a superuser — so the runtime role
-- is `saas_app`, granted only DML, never ownership/superuser.

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'saas_app') then
    create role saas_app nologin;
  end if;
end $$;

grant usage on schema public to saas_app;
grant select, insert, update, delete on all tables in schema public to saas_app;
grant usage, select on all sequences in schema public to saas_app;
alter default privileges in schema public grant select, insert, update, delete on tables to saas_app;
alter default privileges in schema public grant usage, select on sequences to saas_app;
