#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Cross-tenant isolation leak test (release gate). Proves the RLS floor holds:
# as the non-superuser app role (saas_app), tenant A can never see or write tenant
# B's rows, an unset context fails closed (0 rows), WITH CHECK blocks a cross-tenant
# insert, and EVERY tenant_id table has FORCE RLS. Self-contained; cleans up.
#   Usage: bash apps/saas/scripts/leak-test.sh
# NEVER run against the live DB.
# ─────────────────────────────────────────────────────────────────────────────
set -u
DB=${SAAS_DB:-epictete_saas_dev}
PSQL="/Library/PostgreSQL/15/bin/psql"; [ -x "$PSQL" ] || PSQL=psql
export PGPASSWORD=${PGPASSWORD:-slowbob}
# run SQL, return the single scalar result (numeric/text), stripping status tags
scalar() { $PSQL -U slowbob -h localhost -d "$DB" -tAX -c "$1" 2>&1 | grep -E '^-?[0-9]+$' | tail -1; }
raw()    { $PSQL -U slowbob -h localhost -d "$DB" -tAX -c "$1" 2>&1; }
A=aaaaaaaa-0000-0000-0000-00000000000a
B=bbbbbbbb-0000-0000-0000-00000000000b
FAIL=0
ok() { echo "  ✓ $1"; }
no() { echo "  ✗ $1"; FAIL=1; }

echo "== setup: two temp tenants with a cash_sheet each =="
raw "insert into tenants (id,slug,name,status) values ('$A','leak-a','Leak A','active'),('$B','leak-b','Leak B','active') on conflict do nothing;" >/dev/null
raw "insert into cash_sheets (tenant_id,entry_date,total_ca) values ('$A','2020-01-01',111),('$B','2020-01-01',222) on conflict do nothing;" >/dev/null

ROLE="begin; set local role saas_app; select set_config('app.tenant_id','$A',true);"

echo "== 1. tenant A sees its own row =="
v=$(scalar "$ROLE select count(*) from cash_sheets where tenant_id='$A'; rollback;")
[ "$v" = "1" ] && ok "A sees its own cash_sheet" || no "A own count = $v (expected 1)"

echo "== 2. tenant A CANNOT see tenant B's row =="
v=$(scalar "$ROLE select count(*) from cash_sheets where tenant_id='$B'; rollback;")
[ "$v" = "0" ] && ok "A sees 0 of B's rows" || no "LEAK: A saw $v of B's rows"

echo "== 3. unset context fails closed (0 rows) =="
v=$(scalar "begin; set local role saas_app; select count(*) from cash_sheets; rollback;")
[ "$v" = "0" ] && ok "no context → 0 rows (fail-closed)" || no "no context leaked $v rows"

echo "== 4. WITH CHECK blocks cross-tenant insert =="
r=$(raw "$ROLE insert into cash_sheets (tenant_id,entry_date,total_ca) values ('$B','2020-02-02',9); rollback;")
echo "$r" | grep -qi "row-level security\|violates" && ok "cross-tenant insert rejected" || no "cross-tenant insert NOT blocked: $r"

echo "== 5. cross-tenant UPDATE affects 0 rows =="
v=$(scalar "$ROLE with u as (update cash_sheets set total_ca=0 where tenant_id='$B' returning 1) select count(*) from u; rollback;")
[ "$v" = "0" ] && ok "A's update touched 0 of B's rows" || no "LEAK: A updated $v of B's rows"

echo "== 6. structural: EVERY tenant_id table has FORCE RLS (except intentionally-global 'roles') =="
# 'roles' has a NULLABLE tenant_id — NULL = system role shared by all tenants — so it is
# deliberately NOT isolated. Any OTHER tenant_id table without FORCE RLS is a leak.
unprotected=$(raw "select coalesce(string_agg(t.relname, ', '),'') from pg_class t
   join pg_attribute a on a.attrelid=t.oid and a.attname='tenant_id' and not a.attisdropped
  where t.relkind='r' and t.relnamespace='public'::regnamespace and not t.relforcerowsecurity
    and t.relname <> 'roles';" | tail -1)
if [ -z "$unprotected" ]; then ok "all tenant_id tables FORCE row level security"; else no "UNPROTECTED tables (no FORCE RLS): $unprotected"; fi

echo "== 7. structural: every FORCE-RLS table has an isolation policy =="
nopolicy=$(raw "select coalesce(string_agg(c.relname, ', '),'') from pg_class c
  where c.relkind='r' and c.relnamespace='public'::regnamespace and c.relforcerowsecurity
    and not exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename=c.relname);" | tail -1)
if [ -z "$nopolicy" ]; then ok "all FORCE-RLS tables have a policy"; else no "FORCE-RLS tables missing a policy: $nopolicy"; fi

echo "== cleanup =="
raw "delete from tenants where id in ('$A','$B');" >/dev/null

echo ""
[ "$FAIL" = "0" ] && echo "ISOLATION HOLDS ✓ — no cross-tenant leaks" || { echo "❌ LEAK DETECTED"; exit 1; }
