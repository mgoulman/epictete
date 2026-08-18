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
- `0003_billing_skeleton.sql` — plans, subscriptions, subscription_items (per-branch = billing unit), invoices, payments (method-agnostic), tenant ICE/RC. No charging logic.
- `0004_analytics_events.sql` — tenant/branch-scoped funnel events (activation = first Feuille de Caisse).
- `0005_app_role_grants.sql` — the non-superuser `saas_app` runtime role + grants.

## Apply to a local dev DB (localhost — never the live Neon DB in dev)
```bash
createdb epictete_saas_dev
for f in apps/saas/db/migrations/0*.sql; do psql -d epictete_saas_dev -v ON_ERROR_STOP=1 -f "$f"; done
```
Runtime connects as `saas_app`; every request wraps its queries in
`BEGIN; SET LOCAL app.tenant_id = $tenant; … ; COMMIT` (compat-layer work, Phase 1 next).

## Still TODO in Phase 1
- Baseline the 35 existing module tables (cash_sheets, inventory_items, menus, …) + add `tenant_id`/`branch_id`/`source` + RLS (needs the `pg_dump` baseline from Phase 0).
- Tenant context plumbing: AsyncLocalStorage + JWT `tenant_id` + compat-layer GUC injection.
- Lock `/api/db/query` + MCP; Blob `tenant_<id>/` prefixing; suspend side-effect gating.
- Cross-tenant leak-test suite across all routes = the release gate.
