-- Permission matrix for the global membership roles. Idempotent.
-- owner bypasses enforce() (tenant-god) but is seeded for completeness; manager +
-- cashier get real, scoped permissions so enforce("finance.write") etc. is meaningful.

insert into permissions (name, resource, action) values
  ('finance.read','finance','read'),   ('finance.write','finance','write'),
  ('inventory.read','inventory','read'),('inventory.write','inventory','write'),
  ('personnel.read','personnel','read'),('personnel.write','personnel','write'),
  ('reports.read','reports','read'),
  ('users.manage','users','manage'),    ('settings.manage','settings','manage')
on conflict (name) do nothing;

-- helper: grant a set of permission names to a global role
do $$
declare
  r record;
  perms text[];
  pname text;
  rid uuid;
  pid uuid;
begin
  for r in select * from (values
    ('owner',   array['finance.read','finance.write','inventory.read','inventory.write','personnel.read','personnel.write','reports.read','users.manage','settings.manage']),
    ('manager', array['finance.read','finance.write','inventory.read','inventory.write','personnel.read','personnel.write','reports.read']),
    ('cashier', array['finance.read','finance.write','inventory.read','reports.read'])
  ) as t(role_name, perm_names)
  loop
    select id into rid from roles where name = r.role_name and tenant_id is null limit 1;
    if rid is null then continue; end if;
    perms := r.perm_names;
    foreach pname in array perms loop
      select id into pid from permissions where name = pname;
      if pid is not null then
        insert into role_permissions (role_id, permission_id) values (rid, pid)
        on conflict (role_id, permission_id) do nothing;
      end if;
    end loop;
  end loop;
end $$;

select 'Permissions seeded' as done;
