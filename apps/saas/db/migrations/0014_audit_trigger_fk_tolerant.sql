-- When a tenant is deleted, the cascade fires the audit trigger on each child row,
-- which tries to INSERT an audit_logs row referencing the tenant that is being
-- deleted in the same statement → foreign_key_violation. Make the audit write skip
-- gracefully in that case (there's nothing to audit once the tenant is gone).
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
    begin
      insert into audit_logs (tenant_id, user_id, action, table_name, record_id, changes)
      values (v_tenant, v_user, lower(tg_op), tg_table_name, v_record, v_changes);
    exception when foreign_key_violation then
      null; -- tenant is being deleted in this same transaction; nothing to audit
    end;
  end if;
  return coalesce(NEW, OLD);
end $$;
