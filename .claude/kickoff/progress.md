# Progress log — Epictète SaaS

## 2026-08-18 — Kickoff complete, brief approved
- Ran full kickoff (5 profiles: saas-architect, product-ux, growth-gtm, business-compliance, ops-reliability).
- Foundational decisions: regional scale, Morocco-first, free-pilot-first, monorepo (D1 revised from straight-copy after user clarified the live app stays a separate evolving product).
- Round-A debate converged: tenant=account/branch=restaurant hierarchy (unanimous); RLS fail-closed floor; invite-gated cohort; Feuille de Caisse as hero + activation metric; Sentry PII fix + JWT-secret kill front-loaded to Phase 0.
- Decisions D1–D10 answered (D1 monorepo; D2–D10 defaults). Brief persisted.
- **Next:** Phase 0 — monorepo restructure (pending explicit go before touching live prod) + the make-or-break RLS spike.

<!-- Append significant steps, spawns, and consults below as Phase 9 execution happens. -->

## 2026-08-18 — Phase 0 execution (monorepo + spike)
- **Monorepo stood up** (D1): Turborepo + pnpm workspace; live app → `apps/restaurant`
  (@epictete/restaurant), scaffolded `apps/saas` (@epictete/saas) shell. npm→pnpm.
  Both apps build: tsc 0 errors; `pnpm build` (turbo→next build) green for both.
  Committed on branch `saas/monorepo`; main/prod untouched (Vercel cutover deferred to end).
- **Spike 1 (make-or-break) PASSED**: shared-DB + tenant_id + Postgres RLS via transaction-local
  `SET LOCAL app.tenant_id` gives correct isolation on a reused `pg` Pool (max:1) with NO
  cross-request GUC bleed; WITH CHECK blocks cross-tenant insert; fail-closed on unset tenant.
  Findings baked into the plan: (a) app MUST connect as a NON-SUPERUSER role (superusers bypass
  RLS; dev `slowbob` is superuser); (b) tables need `FORCE ROW LEVEL SECURITY`; (c) policy must use
  `NULLIF(current_setting('app.tenant_id',true),'')::uuid` (clean fail-closed, no cast error);
  (d) latency: BEGIN/SET LOCAL/COMMIT adds round-trips — measure real cost vs Neon-EU in Phase 1,
  consider collapsing into one multi-statement round-trip in the compat layer.
- **Schema snapshot (partial)**: found **24 orphan tables** (cash_sheets, inventory_items, menus,
  menu_items, recipes, salle_*, staff_*, vendors, users, sales_*, invoices, misc_expenses, …) that
  exist in the DB with NO CREATE TABLE migration → **the DB is not reproducible from migrations**.
  Baseline `pg_dump --schema-only` BLOCKED on this machine (server 15.6, only pg_dump 14 available).
  TODO Phase 1: generate baseline from a 15+ client (brew postgresql@16 / libpq) or a prod dump;
  it becomes the reproducible starting point for the SaaS DB before the tenant_id/RLS layer.
- **Security debt flagged**: `epictete-492501-b1efb2fc36ec.json` (Google service-account key) committed
  in git; Neon prod password + Sentry DSN pasted in chat → rotate + scrub history.
- **Next (Phase 0 finish → Phase 1):** generate the schema baseline; front-load security fixes
  (Sentry includeLocalVariables off, lock /api/db/query + MCP, kill hardcoded JWT secret); then
  Phase 1 tenant model (tenants/branches/memberships + tenant_id + RLS + billing skeleton).

## 2026-08-18 — Phase 1 (core tenancy model) — localhost, live Neon untouched
- Wrote the SaaS DB migration set (apps/saas/db/migrations/): 0001 identity+RBAC
  (users/profiles/roles/permissions — role moved OFF profiles to memberships),
  0002 tenancy (tenants/branches/memberships + RLS), 0003 billing skeleton
  (plans/subscriptions/subscription_items[per-branch]/invoices/payments[method-agnostic]
  + tenant ICE/RC), 0004 analytics_events, 0005 non-superuser saas_app role + grants.
- RLS uses the Spike-1-validated pattern: FORCE ROW LEVEL SECURITY + policy
  `tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid`.
- Created fresh local DB `epictete_saas_dev`, applied all 5 migrations (14 tables), and ran a
  multi-tenant isolation test: provisioned 2 tenants, then as the non-superuser saas_app role
  verified per-tenant isolation on tenants/branches/memberships/subscriptions/subscription_items/
  analytics_events, fail-closed on unset tenant, and WITH-CHECK blocking cross-tenant insert — 11/11 pass.
- **Next Phase 1:** baseline the 35 module tables (+tenant_id/branch_id/source +RLS) once the
  pg_dump baseline exists; tenant-context plumbing (ALS + JWT tenant_id + compat-layer GUC injection);
  lock /api/db/query + MCP; Blob tenant-prefixing; suspend side-effect gating; leak-test suite gate.
