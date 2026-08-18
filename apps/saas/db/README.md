# SaaS database

Multi-tenant schema for `@epictete/saas`. **Separate DB from the restaurant app.**
Isolation model (validated by Phase 0 Spike 1): shared DB + `tenant_id` +
Postgres **RLS** (fail-closed floor) via transaction-local `SET LOCAL app.tenant_id`,
with the app connecting as a **non-superuser** role (`saas_app`) and tables using
`FORCE ROW LEVEL SECURITY`. Policy shape: `tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid`.

Hierarchy: `user → membership(role) → tenant (account = billing entity = RLS boundary) → branch (restaurant)`.

## Migrations (apply in order)
- `0001_identity_rbac.sql` — global users/profiles + roles/permissions catalog (role now per-membership, not on profiles).
- `0002_tenancy.sql` — tenants, branches, memberships + RLS.
- `0003_billing_skeleton.sql` — `billing_`-prefixed skeleton: billing_plans, billing_subscriptions, billing_subscription_items (per-branch = billing unit), billing_invoices, billing_payments (method-agnostic), tenant ICE/RC. No charging logic. (Prefixed to avoid clashing with the module `invoices` table.)
- `0004_analytics_events.sql` — tenant/branch-scoped funnel events (activation = first Feuille de Caisse).
- `0005_app_role_grants.sql` — the non-superuser `saas_app` runtime role + grants.
- `0006_module_tables.sql` — the 47 restaurant module tables (cash_sheets, inventory_*, menus, salle_*, staff_*, vendors, …), baselined from the live schema (`schema/restaurant-baseline.sql`).
- `0007_tenantize_modules.sql` — adds `tenant_id` (FK, cascade) + nullable `branch_id` + fail-closed RLS to all 47 module tables; `source` column on cash/stock entry tables.
- `0008_scope_unique_constraints.sql` — makes single-tenant UNIQUE constraints per-tenant (cash_sheets date, category name, etc.); `tenants.slug` stays globally unique.

`schema/restaurant-baseline.sql` is the full `pg_dump --schema-only` of the restaurant DB (reproducibility reference).

## Apply to a local dev DB (localhost — never the live Neon DB in dev)
```bash
createdb epictete_saas_dev
for f in apps/saas/db/migrations/0*.sql; do psql -d epictete_saas_dev -v ON_ERROR_STOP=1 -f "$f"; done
```
Runtime connects as `saas_app`; every request wraps its queries in
`BEGIN; SET LOCAL app.tenant_id = $tenant; … ; COMMIT` (compat-layer work, Phase 1 next).

## Done
- ✅ Full multi-tenant schema (61 tables): tenancy + billing skeleton + analytics + all 47 module tables, each with `tenant_id` + fail-closed RLS. Per-tenant unique constraints.
- ✅ Tenant-context plumbing (`@epictete/core/db`): AsyncLocalStorage + `TenantDb` (transaction-local `SET LOCAL app.tenant_id`).
- ✅ JWT `tenant_id` + request-boundary wiring (`@epictete/core/auth`, apps/saas resolveTenant + `/api/my-tenant`).
- ✅ Isolation verified end-to-end and across module tables (localhost `epictete_saas_dev`).

## Still TODO in Phase 1
- Wire the SaaS auth/login flow to actually mint these JWTs (Phase 2); populate ALS in middleware.
- Point the app's shared module code at the tenant-aware `TenantDb` (compat-layer migration).
- Lock `/api/db/query` + MCP; Blob `tenant_<id>/` prefixing; suspend side-effect gating.
- Cross-tenant leak-test suite across all routes = the release gate.
- Provisioning function (`provisionTenant`) + lifecycle hooks; audit_logs (tenant-scoped) for the SaaS.
