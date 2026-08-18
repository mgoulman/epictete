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

## 2026-08-18 — Phase 1 (tenant-context plumbing) — localhost, live Neon untouched
- Started `packages/core` (@epictete/core) — the shared, tenant-aware db layer:
  - `src/db/tenant-context.ts`: AsyncLocalStorage TenantContext + runWithTenant()/getTenantContext()/requireTenantContext().
  - `src/db/client.ts`: TenantDb — every query() wraps in `BEGIN; [SET LOCAL ROLE <rlsRole>]; select set_config('app.tenant_id',$1,true); <query>; COMMIT`, reading tenant from ALS. Fail-closed (throws with no context). unsafeQuery() escape hatch for provisioning/platform-admin. rlsRole configurable (dev superuser drops to saas_app per-txn; prod connects as saas_app directly).
- Added tsx (root) + a plumbing test: through TenantDb.query()+runWithTenant() on epictete_saas_dev — 6/6 pass (per-tenant reads, fail-closed on no context, WITH CHECK blocks cross-tenant insert). tsc 0 errors.
- **Next Phase 1:** wire ALS population at request entry (JWT tenant_id claim + middleware/route boundary) into apps/saas; then baseline+retrofit the 35 module tables (tenant_id/branch_id/source + RLS) once pg_dump baseline exists; lock /api/db/query + MCP; Blob prefixing; suspend gating; leak-test suite gate.

## 2026-08-18 — Phase 1 (JWT tenant_id + request-boundary wiring) — localhost, live Neon untouched
- packages/core: added `src/auth/jwt.ts` (signSaasJWT/verifySaasJWT with {sub, tenant_id, tenant_slug, role}), exported `@epictete/core/auth` (jose).
- apps/saas wired to consume the core: transpilePackages @epictete/core + serverExternalPackages pg; deps @epictete/core (workspace) + pg + jose; .env.local -> local epictete_saas_dev (DB_RLS_ROLE=saas_app). Added lib/db.ts (TenantDb singleton), lib/tenant.ts (resolveTenant from the saas_token cookie), and app/api/my-tenant/route.ts (resolveTenant -> runWithTenant -> RLS-scoped db).
- E2E through a REAL Next route on the saas dev server (:4010): forged per-tenant JWTs, curled /api/my-tenant — each token returns ONLY its own tenant/branches, two tokens see different tenants, no cookie -> 401. 5/5 pass. tsc 0 errors (core + saas).
- The full chain is now proven: request -> JWT(tenant_id) -> ALS context -> SET LOCAL app.tenant_id -> RLS. 
- **Next Phase 1:** baseline + retrofit the 35 module tables (tenant_id/branch_id/source + RLS) once the pg_dump baseline exists; lock /api/db/query + MCP; Blob tenant-prefixing; suspend side-effect gating; cross-tenant leak-test suite gate. Then Phase 2 (invite/login flow to actually mint these JWTs + onboarding + super-admin console).

## 2026-08-18 — Phase 1 (data foundation COMPLETE) — localhost, live Neon untouched
- Generated the full schema baseline via /Library/PostgreSQL/15/bin/pg_dump (server 15.6):
  apps/saas/db/schema/restaurant-baseline.sql (53 tables, --schema-only reproducibility artifact).
- 0003 rewritten with `billing_`-prefixed tables (billing_invoices etc.) to avoid clashing with
  the restaurant module `invoices` table.
- 0006 module tables: 47 restaurant module tables baselined into the SaaS DB (excl. identity/rbac/audit,
  which are modeled cleanly in 0001; carried the benign update_updated_at trigger).
- 0007 tenantize: added tenant_id (FK cascade) + nullable branch_id + fail-closed RLS to all 47 module
  tables; source column on cash_sheets/inventory_movements/sales_items/daily_entries.
- 0008: converted single-tenant UNIQUE constraints to per-tenant (cash_sheets/daily_entries date,
  inventory_categories name, notifications dedup_key, salary_records, site_content section, attendance,
  sales_items index); tenants.slug stays globally unique.
- Full sequence 0001..0008 applies cleanly from scratch (61 tables: 55 tenant-scoped + 6 global catalog).
  Module isolation test on real business tables (cash_sheets/inventory_items/menus/inventory_categories):
  two tenants share the same date/category name, each sees only its own rows, fail-closed on unset tenant,
  WITH CHECK blocks cross-tenant insert — all pass.
- **Data foundation is complete.** Next: SaaS auth/login (Phase 2) to mint JWTs; point shared module code
  at TenantDb; lock /api/db/query + MCP; Blob prefixing; suspend gating; provisionTenant + lifecycle hooks;
  leak-test suite gate.

## 2026-08-18 — Phase 1 (compat-layer tenant-awareness, in place) — localhost, live Neon untouched
- Made the Supabase-compat db layer (apps/restaurant/lib/db.ts) tenant-aware: added a single
  `executeQuery()` that ALL builder queries + the raw query() now funnel through. When a
  @epictete/core tenant context is active it wraps in `BEGIN; SET LOCAL ROLE <rlsRole>;
  set_config('app.tenant_id',$1,true); <query>; COMMIT` (RLS-scoped); with NO context it is a
  plain pool.query — byte-identical to before, so the single-tenant restaurant is unaffected.
  Added @epictete/core dep + transpilePackages/serverExternalPackages to the restaurant.
- Restaurant BUILD passes (live app safe); tsc 0 errors.
- Verification note: the compat-builder scoping could not be verified in the test harnesses tried —
  (a) tsx duplicates @epictete/core across the symlink boundary → two AsyncLocalStorage instances
  (harness artifact, NOT a code bug); (b) a temp restaurant route is blocked by the app's auth
  middleware. The mechanism is identical to the packages/core TenantDb that already passed e2e in
  the real Next SaaS runtime (where the bundler dedupes @epictete/core).
- **Clear next step:** EXTRACT the compat builder into packages/core (@epictete/core/db) as a
  createDb(pool, {rlsRole}) factory so BOTH apps share it — the SaaS then uses the tenant-aware
  builder directly and it's verifiable via a SaaS route (no auth-middleware/dedup issues). The
  in-place executeQuery logic moves there verbatim.
