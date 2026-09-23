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

## 2026-08-18 — Phase 1 (compat-layer EXTRACTED to packages/core) — localhost, live Neon untouched
- Ported the ~700-line Supabase-compat query builder into packages/core/src/db/compat.ts as a
  `createDb({ pool, rlsRole?, audit? })` factory. Builder classes take an injected DbContext
  { execute, audit }; execute is the tenant-aware wrapper (getTenantContext -> BEGIN; SET LOCAL
  ROLE; set_config('app.tenant_id'); ...; COMMIT). Exported via @epictete/core/db.
- apps/restaurant/lib/db.ts is now a THIN wrapper: creates the env-based pool + its own audit
  hook (cookie/JWT -> audit_logs) + createDb. API preserved (default db, named query, db.pool).
  Restaurant BUILD passes, tsc 0 errors -> live app behavior unchanged (no tenant context -> plain
  pool.query).
- apps/saas/lib/db.ts uses the SAME createDb (pool -> epictete_saas_dev, rlsRole saas_app).
- VERIFIED in the real SaaS Next runtime: GET /api/my-tenant now exercises db.from('menus').select();
  each tenant's JWT returns menuCount=2 (its own), NOT 4 (total) -> the shared BUILDER is
  tenant-scoped via RLS. Tenants isolated; no cookie -> 401. (tsx couldn't verify earlier due to
  symlink module-dup; the bundled Next app dedupes @epictete/core, so it works.)
- **Route/compat-layer migration foundation is DONE**: one shared tenant-aware builder for both apps.
  Remaining: bring the actual restaurant route handlers + the auth/session/enforce layer into the SaaS
  (tenant-aware), lock /api/db/query + MCP, Blob prefixing, suspend gating, provisionTenant, leak-test gate.

## 2026-08-18 — Phase 9: SaaS route/auth migration + UI redesign (localhost, live Neon untouched)
Re-consulted product-ux (scope + UI critique + redesign direction). User decisions: foundation-first
design; Menu/Recipes -> Phase 2; pure-wedge (defer Salle/Cuisine POS); drop dead search.

**MVP scope locked:** Dashboard · Feuille de Caisse (hero) · Rapports · Dépenses · Fournisseurs ·
Inventaire · Achats · Personnel · Présence · Utilisateurs · Restaurant-profile. Deferred/dropped:
Salle, Cuisine, Transport, Marketing, Docs, serveur role.

**Built + VERIFIED at runtime (dev server, real login):**
- Design system: apps/saas/app/globals.css — olive ramp, cream surfaces, semantic tokens
  (positive/warning/danger/info), 3-step radius, one soft shadow, Inter-only (no Playfair/glow).
  Inter wired via next/font in layout.tsx.
- UI primitives (apps/saas/components/ui): Button, Input+Label, Card, Badge, StatCard, Table,
  Sparkline, PageHeader, cn. No hardcoded hex — all via --color-accent tokens.
- App shell (components/shell): AppShell + Sidebar (grouped wedge-first nav PILOTAGE/ARGENT/STOCK/
  ÉQUIPE/RÉGLAGES) + Header (branch-context pill, lang toggle, bell, profile dropdown w/ logout).
  Mobile drawer. No splash, no dead search, no serveur redirect. Nav model in lib/nav.ts (perm-gated).
- Auth/session (the route/auth migration core):
  - packages/core compat.ts: added unsafeQuery() escape hatch (platform-level, bypasses tenant txn)
    for cross-tenant identity/session lookups.
  - apps/saas/lib/auth.ts: withTenant() route boundary (resolve -> runWithTenant), getSaasSession()
    (membership role+perms), enforce().
  - lib/session.ts getSessionView(); login page + /api/auth/login (crypt() verify -> active membership
    -> signSaasJWT{sub,tenant_id,tenant_slug,role} -> saas_token cookie) + /api/auth/logout.
  - (app)/layout.tsx gates on getSessionView -> redirect /login; root / redirects by session.
- Screens: Dashboard (cash-first 3-tile hero + supplier + 7-day sparkline + "Fermer la caisse" CTA +
  first-run 3-step guided card when no cash sheet); Inventaire /stock list (Table template, status
  badges, empty state); ComingSoon placeholders for the Phase-2 nav routes.
- Seed: apps/saas/db/seed/demo.sql — idempotent demo tenant "Le Gourmet" + owner login
  (owner@demo.ma / demo1234) + 7d cash sheets, inventory (2 low), staff+attendance, vendor debts.

**E2E verification (curl, real dev runtime):** unauth / -> 307 /login; correct login sets cookie;
bad password -> 401; authed dashboard 200 with tenant-scoped KPIs computed correctly (Caisse 8 450 DH,
Dû fournisseurs 4 250 DH, Espèces 3 448 DH, Présence 3/4, Stock bas 2); /stock lists real items;
logout clears cookie -> dashboard 307 -> /login. All data RLS-scoped to the logged-in tenant.

**Remaining:** Feuille de Caisse extraction to /caisse (the hero, task #45); then Phase-2 modules.

## 2026-08-18 — Phase 9 cont.: Feuille de Caisse hero (/caisse) — MVP scope COMPLETE
- lib/caisse.ts: shared model + computeTotals (Espèce encaissements ADD to Total Espèces only,
  Déduit ignored — same corrected formula as the live restaurant fix). num() tolerant parse.
- /api/caisse: GET (load by date) + POST (upsert on (tenant_id,entry_date), totals RECOMPUTED
  server-side, source='saas') via withTenant; emits analytics_events 'cash_sheet.saved' (activation).
- (app)/caisse: server page loads the sheet for ?date= (or today) via runWithTenant; CaisseForm
  (client) = two-pane Recettes/Sorties + sticky totals rail (CA, Dépense, Espèce Caisse, Total
  Espèces, Solde théorique colored) + Autres encaissements w/ Espèce|Déduit toggle + date picker
  + Save (activation) + Print (print-window).
- VERIFIED e2e (real dev runtime, owner login): POST returns correct totals (caisse 500, espèces
  2500, dépense 500, solde 2000, especeSources 1000); GET reloads persisted sources+depenses with
  Espèce type; analytics_events row scoped to Le Gourmet; sheet RLS-scoped (source='saas'); page 200.
- All 6 MVP migration tasks done: shell, primitives, nav, auth/session, dashboard, inventaire, caisse.
  Remaining = Phase-2 modules (currently ComingSoon placeholders) + onboarding/invite + super-admin.

## 2026-08-19 — Phase 2: Onboarding + team-invite flow (localhost; live Neon untouched)
Re-consulted product-ux for the invite/onboarding UX (owner-only admin, single-use 7d link-share
tokens rotate-on-resend, /dashboard landing, existing-email adds membership, MAD fixed, skippable
team step, light pilot consent). Built + VERIFIED e2e (11/11):
- DB: 0009_invitations.sql (invitations table + RLS + partial-unique 1-pending-per-email; tenants.city)
  and 0010_invitations_resend.sql (updated_at, sent_count). Applied to dev.
- Invite API /api/team: GET members+pending invites, POST create (enforce users.manage, manager|cashier
  only, dupe/member guards, emits invite.created), PATCH resend (rotate token+reset expiry), DELETE revoke.
- Accept: /api/invite/accept (public; platform-level unsafeQuery by token; branch existing-user (verify
  password)/new-user (create user+profile); attach membership; mark accepted; emit invite.accepted +
  consent.accepted; mint saas_token). Public /invite/[token] page + AcceptForm with valid/expired/revoked/
  used states.
- Restaurant profile: /api/tenant GET+PUT (enforce settings.manage) + /reglages/restaurant form
  (name/city/ICE/RC/billing_email + branch name; MAD fixed, slug read-only). Replaced ComingSoon.
- Team page /reglages/utilisateurs: members table + pending invites + invite panel (copy link) +
  resend/revoke. Replaced ComingSoon. Both Réglages nav items un-"soon"ed.
- Onboarding: /api/consent + ConsentGate (one-time owner pilot-terms checkbox before dashboard);
  FirstRun upgraded to real per-step completion (profile=city set, team=member>1 or invite, caisse=
  cashCount>0) + "X sur 3" progress bar + done/current/future states. Legal placeholder pages
  /legal/cgu + /legal/confidentialite.
- E2E (curl, real runtime): owner login → consent gate → accept → KPIs → invite cashier (43-char token)
  → accept page → accept as new user → cashier dashboard 200 → cashier invite BLOCKED 403 → token
  single-use 410 on reuse → cashier login works → profile PUT saves. DB: cashier user+membership+accepted
  invite; consent/invite events recorded.
- NOTE: demo tenant "Le Gourmet" is now in a used/onboarded state; re-run db/seed/demo.sql to reset to a
  fresh onboarding demo.

## 2026-08-19 — Phase 2: Super-admin console + tenant provisioning (localhost; live Neon untouched)
The missing structural piece — how real pilot restaurants get created (was seed-only).
- core jwt.ts: added PlatformClaims + signPlatformJWT/verifyPlatformJWT (separate from SaasClaims so
  tenant tokens always carry tenant_id; platform tokens carry none).
- DB 0011_platform_admin.sql: users.is_platform_admin. Seed db/seed/platform_admin.sql →
  super@epictete.ma / super1234 (no tenant).
- Auth: lib/platform.ts (PLATFORM_COOKIE saas_admin_token, resolvePlatformAdmin re-checks the flag live,
  requirePlatformAdmin). /api/auth/login branches: platform admin → platform token + redirect /admin;
  else membership flow. logout clears both cookies. Root / routes admins to /admin. Login page honors
  server redirect.
- Provisioning: lib/provision.ts provisionTenant() (slugify+unique slug → tenant+default branch+OWNER
  invitation) — platform-level unsafeQuery. /api/admin/provision (requirePlatformAdmin) returns the owner
  accept link + emits tenant.provisioned. /api/admin/tenants GET (list w/ members/feuilles/has_owner) +
  PATCH status (active/suspended/offboarding, emits tenant.status_changed).
- UI: /admin route group (own layout gated by resolvePlatformAdmin; AdminBar) + AdminConsole (KPIs
  Restaurants/Actifs/Onboardés, provision panel w/ copyable owner link, tenants table w/ suspend/réactiver).
- E2E VERIFIED (9/9 + gating): admin login→/admin; console renders; provision "Café Test" (Rabat) → owner
  invite link; owner accept page shows Propriétaire; owner accepts (new user) → dashboard 200; tenant owner
  BLOCKED from admin API (401); suspend→owner login blocked (403); reactivate→owner login ok. DB: Café Test
  tenant + owner2 membership role=owner.
- Full lifecycle now works: provision → owner invite → accept → onboard (consent/profile/team/1st caisse) →
  suspend/reactivate. Platform-admin login: super@epictete.ma / super1234.

## 2026-08-19 — Phase 0 completeness foundation (per completeness-plan.md; localhost; live Neon untouched)
Decisions: foundations-first, pilot-ready bar. Built the shared layer the SaaS was missing + fixed
the critical trust/safety bugs. All VERIFIED at runtime.
- Shared UI infra: ToastProvider (retokened, mounted in (app)+admin layouts) + toast animations;
  Modal (overlay/focus-trap/escape/scroll-lock) + ConfirmDialog with useConfirm() hook; ErrorState +
  (app)/error.tsx, admin/error.tsx, global-error.tsx, not-found.tsx.
- Error/validation infra: lib/api/handler.ts (withErrorHandler/apiError/ApiRouteError, ZodError→400) +
  lib/api/fetch-json.ts (fetchJson/ApiError) + lib/observability/report.ts (Sentry-ready shim); zod +
  lib/schemas.ts (caisse/tenantProfile/invite/provision/accept).
- Audit trail: migration 0012 audit_logs (tenant-scoped RLS, read-only) + SECURITY DEFINER audit_trigger
  on 12 tenantized tables; compat.ts execute() now also SET app.user_id so triggers attribute the actor.
  Verified: insert/delete captured with correct user+tenant.
- Permissions: db/seed/permissions.sql — real matrix (owner all / manager ops / cashier finance+inventory
  read + finance.write) so enforce() is meaningful. Verified cashier can save caisse.
- Platform admin already existed (0011); this phase adds the enforcement + standards around it.
- Critical fixes: per-request suspension gating (in (app) layout Suspended screen + withTenant 403 —
  my-tenant migrated onto withTenant so ALL tenant routes covered); caisse hardened (enforce finance.write,
  toast, dirty-disable, unsaved-changes guard on date-change + beforeunload, print popup-block fallback,
  zod server validation); dashboard no longer swallows DB errors to 0 (surfaces via error boundary);
  todayISO() local-time; provision idempotency (409 on double-submit) + zod; tenant PUT on standard w/
  explicit tenant predicate; RestaurantForm + TeamManager + AdminConsole retrofit to fetchJson+toast+
  confirm; removed dead Header controls (Bell, FR/EN toggle) + Stock "Ajouter" decoy.
- E2E verified: owner caisse save→audit row w/ user; cashier save allowed (finance.write); zod bad-date→400;
  provision double→409; suspend→my-tenant 403 + caisse 403 + dashboard Suspended; reactivate→200.
  saas builds; restaurant builds (shared compat change is additive/safe).
Remaining: Phase 1 (DoD sweep on remaining screens: login/invite toast, form primitives, DataTable,
skeletons), Phase 2 (module recipe → inventory CRUD + the 6 modules + membership mgmt), Phase 3 (password
reset, account page, verification, impersonation, offboarding, help).

## 2026-08-19 — Phase 1: DoD sweep — form primitives, DataTable, skeletons (localhost)
- Form primitives components/ui/Field.tsx: FormField (label+error+hint+required), TextInput, Textarea,
  Select, MoneyInput (tnum+DH), Checkbox. lib/validation.ts zodErrors() helper for inline field errors.
- DataTable components/ui/DataTable.tsx: search (getSearchText), sortable columns, pagination, optional
  row-click — reuses the Column model (DataColumn adds sortable/sortValue). Migrated Stock (new StockList
  client), Admin tenants, Users members+invites. Fixes the unpaginated-wall + no-search gaps.
- Skeletons components/ui/Skeleton.tsx (+ shimmer CSS) + per-route loading.tsx for dashboard/caisse/stock/
  reglages(restaurant,utilisateurs)/admin — real skeletons instead of blocking blank.
- Invite accept: added password-confirm field + inline min-length/mismatch validation + submit gating
  (login/invite are outside the ToastProvider so they correctly use inline errors, not toasts).
- Verified: build green; Stock/Admin/Users search boxes render; invite confirm field renders.

## 2026-08-19 — Phase 2: modules via the recipe (localhost)
Using the InventoryManager recipe (route + Manager client + page; enforce + zod + audit trigger):
- Dépenses: /api/expenses CRUD + ExpensesManager (category/method selects, total). 
- Fournisseurs: /api/vendors CRUD + /api/vendor-transactions (dette/paiement) + VendorsManager with
  per-vendor solde (SUMIFS in SQL) + total dû + record-mouvement modal.
- Personnel: /api/staff CRUD (soft-delete) + StaffManager.
- Présence: /api/attendance upsert (ON CONFLICT tenant/staff/date) + PresenceManager (optimistic
  present/late/absent toggles, X/N présents).
- Rapports: read-only month summary (CA/dépenses/solde/dû fournisseurs KPIs + last 10 sheets +
  expenses-by-category).
- Un-sooned 5 nav items; only "Achats du jour" remains ComingSoon (it overlaps Dépenses[market_purchase]
  + Inventory restock — deferred rather than build a redundant module).
- E2E verified: expense/vendor+dette/staff+presence create → 200; all module pages 200; vendor in list.
Remaining: Phase 3 lifecycle (password reset, account page, verification, impersonation, offboarding, help).

## 2026-08-19 — Phase 3: account + tenant lifecycle (localhost)
- Account: /reglages/compte + /api/account (change name; change password with current-password
  verify). Profile dropdown now links "Mon compte" + "Aide & support" (WhatsApp CTA).
- Password reset (no email infra → link-share model): 0013_password_resets table; owner generates a
  reset link for a member (/api/members/reset + TeamManager key action), platform admin for any user
  (/api/admin/reset by email); public /reset/[token] page + /api/reset/accept (validate/single-use/
  update). Covers the forgotten-password lockout.
- E2E verified: name change; wrong-current→401, change→login-new→revert; owner-reset→accept→member
  login; reset token single-use 410; pages render.
- DEFERRED (P1, honestly flagged): admin impersonation for support; tenant offboarding UI (export +
  delete, wire offboarding status — compliance-heavy); email verification. Help surface done.

## Completeness plan status
Phase 0 (foundations+critical fixes) ✅ · Phase 1 (DoD sweep: primitives/DataTable/skeletons) ✅ ·
Phase 2 (modules: inventory/members/dépenses/fournisseurs/personnel/présence/rapports) ✅ ·
Phase 3 (account+password reset+help) ✅ core. Remaining: impersonation, offboarding export/delete,
email verification, Achats-du-jour module, + prod-hardening (SECURITY DEFINER, leak-test) at the
external-tenant gate.

## 2026-08-19 — Deferred P1 items completed (localhost)
- Admin impersonation: SaasClaims.impersonated_by; /api/admin/impersonate (mint owner session,
  keep admin cookie) + DELETE (exit); shell ImpersonationBanner; console "Voir" action. Verified e2e.
- Cross-tenant leak-test suite: apps/saas/scripts/leak-test.sh — ISOLATION HOLDS ✓ (own/0-of-B,
  fail-closed, WITH CHECK block, 0-row cross update, every tenant_id table FORCE RLS + policy).
- Tenant offboarding: /api/admin/tenants/export (JSON download, data portability) + DELETE (cascade)
  gated to non-active tenants in the console; 0014 makes the audit trigger FK-tolerant during tenant
  cascade-delete. Verified: export JSON + attachment; provision→offboarding→delete→gone.
Remaining (lower priority): email verification; a dedicated Achats-du-jour module (overlaps
Dépenses+Inventory); prod SECURITY DEFINER rewrite of unsafeQuery paths (external-tenant gate).

---

## 2026-08-23 — v2 Competitive Product Plan approved; Phase 1 (Contrôle de Caisse) started
Founder redirected from "one wow feature" → market-competitive product (3 fronts: design sweep,
Moroccan-edge features, operator console). Full re-kickoff (5 experts, 2 rounds) → brief v2 approved.
See brief.md (v2), tasks/v2-competitive-plan.md, memory saas_competitive_direction.
**Started B2 (marquee, Phase 1):** the écart on the Feuille de Caisse — "Espèces comptées" field +
variance verdict (Équilibré / Manque / Excédent / Non compté). In-app, no external dependency.
Note: this first slice persists `especes_comptees` on `cash_sheets` (migration 0016); the full
append-only `cash_reconciliations` close record (A1) is the next step.

### 2026-08-23 (cont.) — built & typechecked this session
- **Phase 1 DONE:** écart verdict on the Feuille de Caisse (Espèces comptées → Équilibré/Manque/Excédent,
  tolérance 20 DH); dashboard **écart hero banner**; append-only **cash_reconciliations** ledger
  (migration 0017, RLS + REVOKE update/delete = compliance GREEN spine A1), recorded best-effort on save.
- **Design sweep (Front 1, partial):** Fournisseurs **debt hero** (3 StatCards), Dépenses **summary hero +
  category chips**, Rapports rebuilt on the **chart kit** (SeriesBars + RankedBars).
- **Daily loop (Phase 2, partial):** **Achats du jour** finished from the ComingSoon stub — real stock-in
  (achat) / stock-out (consommation) via new `POST /api/stock/movements` (updates qty + inventory_movements
  audit row) + `AchatsManager` UI. `stockMovementSchema` added.
- Migrations to APPLY (additive/safe, no runner in repo): **0016_cash_counted**, **0017_cash_reconciliations**.
- Unauthenticated preview added: `/preview/caisse` (écart), alongside `/preview/dashboard`.

**Remaining / externally-gated:** rest of design sweep (Stock main, Équipe/Présence, Réglages tabs,
onboarding wizard, mobile primitives); linked réception fournisseur→stock→dépense; exports; operator console;
Paie/CNSS engine (needs compliance L1 real-rate sign-off); DGI data-shape (buildable) + clearance (deferred);
WhatsApp digest (needs Meta Business verification + Twilio + job queue); Sentry (needs @sentry/nextjs install +
DSN); leak-test extension; backup/cold-archival; CNDP F211 (legal) + DPA (lawyer). Open decision: D5 pilot city.

### 2026-08-23 (cont. 2) — buildable sweep continued (all typechecked + dev-route-verified)
- **Design sweep (Front 1) extended:** Stock main **summary hero** (En stock/Stock bas/Rupture) + "Achats du
  jour" link; Équipe/Présence **roll-call hero** (Présents/Retards/Absents/Non pointés); Rapports on chart kit.
- **Exports (comptable-ready):** `lib/export-csv.ts` (French `;`-sep + UTF-8 BOM) → **Exporter** buttons on
  Dépenses and Fournisseurs.
- **Operator console (Front 3):** AdminConsole gains **"À risque"** StatCard + **Activité** column
  (last_activity/last7) via `plt_tenants_overview()` rewrite (**migration 0018_tenant_health**).
- **DGI-readiness data-shape (Moroccan edge, buildable half):** **migration 0019_legal_invoices** —
  `tenants.if_`/`tva_regime`, gap-free `legal_invoice_sequences`, immutable `legal_invoices` (issued-invoice
  trigger = compliance red-line). Now **captured in the UI**: Réglages ▸ Restaurant gains **IF** +
  **Régime TVA** fields (schema + `/api/tenant` GET/PUT wired).
- **Linked réception fournisseur→stock→ledger (atomic) — DONE:** new **`db.tx()`** primitive in
  `@epictete/core` compat (one BEGIN/COMMIT with the tenant GUC + RLS role set once — fixes the "each
  db.query is its own txn" footgun). New **`POST /api/stock/reception`**: one supplier delivery restocks N
  items (+ `inventory_movements` audit) and settles the money side atomically — **à crédit** → vendor debt,
  or **payé espèces** → cash expense (`vendor_order`). Multi-line **Réception fournisseur** modal on Achats
  (item/qty/P.U. rows, live total, settlement toggle). Rolls back whole delivery on any failure.
- **Migrations to APPLY** (additive/safe): **0016, 0017, 0018, 0019**. Réception itself needs no new table.

### 2026-08-23 (cont. 3) — backoffice design overhaul (founder: "most ugliest design")
Founder flagged the **super-admin console** (and tenant backoffice) as visually weak — washed-out
cream-on-white, no frame, hollow KPI boxes, bare table. Redesigned both surfaces to a premium,
cohesive identity. All typechecked + dev-route-verified; previews at `/preview/admin`, `/preview/app`.
- **Super-admin console** (`AdminConsole`, `AdminBar`, admin layout): **dark olive command hero**
  (gradient band) as the contrast anchor, holding title + Provisionner CTA + an embedded 4-KPI strip
  (was 4 hollow StatCards). Table rebuilt: **monogram avatars**, colored **activity dots**
  (green/amber/grey), tone-matched action buttons, widened to `max-w-6xl`, titled panel.
- **Tenant shell** (`Sidebar`): **deep-olive rail** (`--color-olive-900`) replacing the plain white
  sidebar — light nav ink, olive-600 active pill + olive-300 left indicator, richer section labels.
  Gives the whole tenant app the same authoritative identity as the console.
- **Tenant dashboard** (`dashboard/page.tsx`): unified **command hero** (olive band) = greeting +
  the day's cash headline + delta + white CTA in one anchor (replaced the plain text greeting +
  separate featured StatCard + redundant bottom "fermer la caisse" CTA). KPI row now Stock/Présence/
  Dû-fournisseurs; charts unchanged.
- **Global primitive polish** (`DataTable`): header band (`bg-secondary/50`) + uppercase micro-labels
  + more row breathing room → lifts every list (Fournisseurs, Dépenses, Stock, Équipe, admin).
- Nav: **Achats du jour** un-flagged from "bientôt" (now actually built this session).
- **Follow-up (founder: "still the super admin dashboard"):** the console was still frameless (top bar +
  marooned content + empty void) while the tenant app got a full dark rail. Gave the admin the **same
  deep-olive sidebar frame** (`AdminSidebar` + two-column `admin/layout.tsx`; `AdminBar` kept as the
  mobile header): brand lockup, `Plateforme › Restaurants` nav (active pill on real `/admin`), admin
  identity + logout footer. Added an **"À suivre" triage panel** (one attention item per tenant —
  suspendu / invitation en attente / à risque — with a one-click impersonate/réactiver) to fill the void
  with operator value. Migrations 0016–0019 applied to the dev DB (prod/Neon still pending).

### 2026-08-23 (cont. 4) — reskin the epictete restaurant BACKOFFICE with the new design language
Founder: "apply same UI on the epictete app, no feature/logic changes." Ran the **rollout skill** (scope →
standard → confirm → parallel sweep → no-leftovers verify). Scope: `apps/restaurant/app/(backoffice)` +
shell + shared primitives. OUT: public marketing site + digital menu (own branding). Purely className/CSS-token.
- **CORE:** `globals.css` — added shadow/radius/gradient/semantic token scale (dark-mode-safe translucent
  -bg tints, brightened semantic fg in `.dark`) + crisp white card. `Sidebar.tsx` — **deep-olive rail**
  (olive-900, olive-600 active, light ink). `admin/page.tsx` — **command hero**. `widgets.tsx` — crisp KPI cards.
- **TIER 2 sweep** (6 parallel agents, one mechanical standard): `bg-white`→token, hand-rolled `<thead>`
  header bands + uppercase `<th>` micro-labels (SortHeader `<th>`s left alone), soft shadow on primary
  cards. Touched finance, reports, personnel(+comps), inventory(+StockCountSheet), menu, recipes,
  transport(+comps), salle(×3), settings(+4 sub), docs, audit, approvals, cuisine. (menus, match-images,
  marketing, users, LoginForm[inline-styles], memos = no qualifying targets.)
- **Fixed-color-chip reverts:** toggle knobs, status dot, yellow-badge text kept literal `bg-white`/`text-black`
  (they sit on fixed-color backgrounds; tokenizing would invert them in dark mode).
- **Motion layer** (framer-motion, already a dep + used in public site): `<MotionConfig reducedMotion="user">`
  in BackofficeShell + content entrance keyed by pathname; hero fade/slide; KPI card mount + hover-lift;
  **sidebar sliding active pill** (`layoutId` on regular + collapsed-parent items; parent/child stay static
  to avoid double-active layoutId conflict).
- **Verify:** `tsc --noEmit` clean (whole app); no-leftovers grep = no theme-surface bg-white/text-black
  left; all 21 touched routes compile (no 500s); `/login` 200 (CSS compiles).
- **CAVEAT:** this touched the **monorepo copy** `apps/restaurant` only. Per [[live_vs_monorepo_structure]]
  the LIVE restaurant deploys from a different repo (new/adds root `app/`) — the reskin must be re-applied
  there to reach production. Visual/dark-mode/animation confirmation needs an authenticated browser session.

---

# Odoo Migration (apps/restaurant) — progress log

- **2026-09-19**: Kickoff run (phases 1-7) for replacing apps/restaurant with self-hosted Odoo. Team of 5 profiles generated. Full parallel discovery + Round A debate completed, self-reconciled. Synthesized brief presented in conversation; founder applied stated defaults.
- **2026-09-19/20**: Got Hetzner API access (explicitly authorized by founder — "total control of the VPS" per the infra owner), confirmed server details (Helsinki/EU datacenter, brand-new box), pulled the real Odoo 19 Enterprise addons (765 modules) from the friend's server, stood up an identical local Odoo 19 Enterprise dev environment via Docker.
- **2026-09-19**: Full module-mapping refined against the real local catalog + marketplace/OCA search — resolved most flagged gaps to native fits (Approvals, Audit log, Memos, WhatsApp, Invoice OCR, Recipes, Salle, Payroll). Transport confirmed as the one genuine custom-build gap.
- **2026-09-19**: Till decision reversed — Odoo POS becomes the real till, LaCaisse.ma fully retired. Full caisse-to-reporting cycle configured and validated end-to-end locally (POS session → kitchen → payment → close/écart → stock → reorder → PO → bill → GL), zero custom code.
- **2026-09-19**: Fixed a live security exposure found on prod (`/web/database/manager` publicly reachable) — flagged, not yet independently reconfirmed as closed.
- **2026-09-23**: Pushed validated module set + `auditlog` custom module to the remote **test** environment only (backed up `epictete_test` DB first). Fixed a version-skew bug (`pos_settle_due` duplicate dialog registration) found locally.
- **2026-09-23**: Founder authorized pulling real production data from Neon (`neondb` — corrects earlier assumption that apps/restaurant used Supabase; Neon is the actual runtime DB) into local Odoo, building the real RBAC module (8-role model), and writing a Playwright test suite across roles. In progress.
