-- ─────────────────────────────────────────────────────────────────────────────
-- Immutable audit trail. Because SaaS mutations run as raw SQL (not always the
-- compat builder), we capture writes at the DB layer via AFTER triggers rather
-- than in app code — nothing can slip through. The trigger fn is SECURITY DEFINER
-- so it can always insert into audit_logs (which itself has RLS for reads), and it
-- stamps the acting user from the transaction-local app.user_id GUC (set by the
-- compat builder alongside app.tenant_id).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists audit_logs (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  user_id    uuid references users(id) on delete set null,
  action     text not null,               -- insert | update | delete
  table_name text not null,
  record_id  uuid,
  changes    jsonb,                        -- new row, or {old,new} for updates
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_tenant_idx on audit_logs(tenant_id, created_at desc);
create index if not exists audit_logs_table_idx on audit_logs(tenant_id, table_name, created_at desc);

alter table audit_logs enable row level security;
alter table audit_logs force  row level security;
drop policy if exists audit_logs_read on audit_logs;
-- read-only for tenants (their own rows); writes come only via the SECURITY DEFINER trigger
create policy audit_logs_read on audit_logs
  for select using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
grant select on audit_logs to saas_app;

create or replace function audit_trigger() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  v_tenant uuid;
  v_user   uuid;
  v_record uuid;
  v_changes jsonb;
begin
  if (tg_op = 'DELETE') then
    v_tenant := OLD.tenant_id; v_record := OLD.id; v_changes := to_jsonb(OLD);
  else
    v_tenant := NEW.tenant_id; v_record := NEW.id;
    v_changes := case when tg_op = 'UPDATE'
      then jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
      else to_jsonb(NEW) end;
  end if;
  begin v_user := nullif(current_setting('app.user_id', true), '')::uuid; exception when others then v_user := null; end;
  if v_tenant is not null then
    insert into audit_logs (tenant_id, user_id, action, table_name, record_id, changes)
    values (v_tenant, v_user, lower(tg_op), tg_table_name, v_record, v_changes);
  end if;
  return coalesce(NEW, OLD);
end $$;

-- Attach to the business-critical tenantized tables (all have tenant_id from 0007).
do $$
declare t text;
begin
  foreach t in array array[
    'cash_sheets','inventory_items','inventory_movements','memberships','invitations',
    'branches','vendors','vendor_transactions','expenses','staff_members','attendance','daily_entries'
  ] loop
    if to_regclass('public.'||t) is not null then
      execute format('drop trigger if exists trg_audit on public.%I', t);
      execute format('create trigger trg_audit after insert or update or delete on public.%I for each row execute function audit_trigger()', t);
    end if;
  end loop;
end $$;
