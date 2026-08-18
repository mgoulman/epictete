# saas-architect — task checklist

Model: shared Neon Postgres + `tenant_id` + Postgres RLS (fail-closed floor) + app-layer builder injection + cross-tenant leak-test gate. Hierarchy: user → membership(role) → tenant(account=billing+RLS boundary) → branch(restaurant).

## Phase 0 — monorepo + pre-tenant security
- [ ] Stand up Turborepo/pnpm monorepo; move live app → `apps/restaurant` (verify identical prod deploy on a branch first); extract `packages/core` (db layer + shared domain modules + UI + i18n); scaffold `apps/saas`.
- [ ] Snapshot the LIVE Neon schema; write migrations for orphan tables (`users`, `sales_items`, `staff_members`, `staff_types`, `sales_imports`, …) so the DB is reproducible.
- [ ] **Spike 1 (make-or-break):** prove `BEGIN; SET LOCAL app.tenant_id; …; COMMIT` gives correct isolation with NO cross-request bleed on Neon's reused `max:1` pool; measure latency delta. Everything gates on this.
- [ ] **Spike 2:** retrofit AsyncLocalStorage + builder/`query()` tenant injection on a slice of routes; build the automated cross-tenant leak-test harness.
- [ ] Front-loaded security fixes (before any tenant data): Sentry `includeLocalVariables:false` + `beforeSend` PII scrub (PII list from business-compliance) + `tenant_id` tag; lock `/api/db/query` (inject tenant server-side, reject client tenant filters) + MCP (tenant in OAuth token); kill hardcoded JWT secret.

## Phase 1 — multi-tenant core
- [ ] Schema: `tenants(slug UNIQUE, status, billing fields)`, `branches(tenant_id, is_default)`, `memberships(tenant_id, user_id, role_id)`; `roles` global + nullable `roles.tenant_id`.
- [ ] Add `tenant_id` (NOT NULL, RLS-defaulted) to all ~35 tables + `audit_logs`; nullable `branch_id` + nullable `source` on operational/cash/stock tables; backfill to tenant-0.
- [ ] Add the 6 billing entities from business-compliance (`plans`, `subscriptions`, `subscription_items` per-branch, `invoices`, `payments` method-agnostic, tenant `ice`/`rc`/`billing_email`).
- [ ] Add `analytics_events` (tenant/branch scoped) for product-ux metrics.
- [ ] Enable RLS on every tenant table (`USING tenant_id = current_setting('app.tenant_id')::uuid`); wire builder + raw `query()` to set the GUC in a per-query transaction and inject tenant.
- [ ] JWT carries `tenant_id`; role/perms from active membership; ALS tenant context at route entry + `getServerSession`.
- [ ] Split `admin` → tenant-admin (passes RLS within tenant) vs `platform_admin` (audited bypass for super-admin console); update `enforce*`.
- [ ] Blob keys `tenant_<id>/…` + prefix-verify on read/delete (ops dependency).
- [ ] `suspend` flips `tenant.billing_status` and gates all outbound (WhatsApp/Twilio/push) + cron skips suspended (ops dependency).
- [ ] Rewrite cron routes to iterate tenants + set context; public routes resolve tenant from session (subdomains deferred).
- [ ] Provisioning + lifecycle hooks: `provisionTenant / suspend / resume / exportTenant / deleteTenant` (ops consumes).

## Phase 1 gate
- [ ] Cross-tenant leak-test suite green across all routes → only then load real tenant data.

Cross-deps: billing entities ← business-compliance; role tiers ← product-ux; lifecycle hooks + Blob/suspend gates → ops-reliability; subdomain deferral → growth-gtm SEO.
