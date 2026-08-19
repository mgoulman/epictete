-- Local dev platform admin. Idempotent. NEVER run against live.
--   Login: super@epictete.ma / super1234  → routed to /admin
create extension if not exists pgcrypto;

insert into users (id, email, password_hash, is_platform_admin)
values ('99999999-9999-9999-9999-999999999999', 'super@epictete.ma',
        crypt('super1234', gen_salt('bf')), true)
on conflict (email) do update set is_platform_admin = true;

insert into profiles (id, email, full_name)
values ('99999999-9999-9999-9999-999999999999', 'super@epictete.ma', 'Super Admin')
on conflict (id) do nothing;

select 'Platform admin ready — super@epictete.ma / super1234' as done;
