# Unified Brief — Epictète → Multi-Tenant Restaurant SaaS

**Status:** approved (decisions answered 2026-08-18). Execution = Phase 0.
**Scale:** regional (dozens–hundreds of tenants) · **Market:** Morocco-first · **Monetization:** free-pilot-first · built from the current single-tenant app.

## Decisions (answered)

- **D1 — Repo strategy = MONOREPO + shared core.** Turborepo/pnpm. `packages/core` (shared: db layer, domain modules — inventory, finance, cash-sheets, menu, personnel, salle, UI, i18n) + `apps/restaurant` (the current LIVE single-tenant app; keeps its own restaurant-specific features; same prod deploy) + `apps/saas` (new multi-tenant app). Rationale: the live restaurant app stays a separate, actively-evolving product **and** shares ~95% of a core with the SaaS — a folder copy would freeze that core into two drifting halves needing every fix applied twice. Monorepo = shared fixes reach both, independent deploys, one `node_modules` (also fixes the chronic local disk-full problem). Cost: a one-time, runtime-neutral restructure of the live app into `apps/restaurant`, done on a branch and verified before it replaces prod.
- **D2 — Operating entity = Morocco-incorporated** (default). Clean local compliance, CMI/local rails, ICE invoicing. (No Stripe for Morocco merchants.)
- **D3 — Billing unit = per-restaurant (branch), billed to the owner-account** (default).
- **D4 — Pilot = invite-gated WhatsApp cohort** (default). Super-admin provisions manually; public self-serve signup deferred.
- **D5 — AR/RTL = deferred; FR-only MVP** (copy authored so AR drops in later).
- **D6 — Multi-branch = build the branch model now, defer the branch-switcher UI** until a pilot opens a 2nd location.
- **D7 — Lawyer = engage a Moroccan data-protection lawyer before the first EXTERNAL tenant** (compliance adopts safe defaults now: 72h breach / 30-day erasure / DPA skeleton).
- **D8 — Sentry `includeLocalVariables` = OFF for the multi-tenant app** (+ `beforeSend` PII scrub + `tenant_id` tag).
- **D9 — Backup = Neon Launch, 7-day PITR** for the pilot.
- **D10 — Pilot geography = one dense city cluster** (city TBD — where the founder/Epictète is).

**Emergent (not blocking):** C4 — Morocco entity + Moroccan data on Neon-EU = cross-border transfer needing CNDP authorization (→ lawyer, D7). MOWAKABA — conditional only ("sous réserve d'éligibilité", packaged as a one-time project), never a flat claim. POS import — deferred; add a nullable `source` column now so it's purely additive later.

## Recommended architecture

- **Isolation = shared Neon Postgres + `tenant_id` on every table + Postgres RLS as a fail-closed floor** (transaction-local `SET LOCAL app.tenant_id` GUC via AsyncLocalStorage), because 29 route files use raw SQL app-layer scoping can't catch. App-layer builder injection for ergonomics; a **cross-tenant leak-test suite is the release gate**.
- **Entity hierarchy:** `user → membership(role) → tenant (= owner-account = billing entity = RLS isolation boundary) → branch (= restaurant)`. Meter per branch; invoice the account.
- **Billing entities (day-1 skeleton, no charging):** `plans`, `subscriptions` (per tenant), `subscription_items` (per branch = the billing unit), `invoices`, `payments` (method-agnostic: manual/virement/cheque/cmi/…), tenant billing fields incl. `ice`/`rc` (Moroccan invoicing) + `billing_email`.
- **Auth:** JWT carries `tenant_id`; role per-membership; `admin` splits into tenant-admin vs platform-admin; invite/accept-invite (no public signup for pilot); kill the hardcoded JWT default secret.
- **Routing:** single app domain, tenant from session (optional `/t/[slug]`); subdomains/custom domains deferred.
- **Provisioning + lifecycle hooks:** `provisionTenant / suspend / resume / exportTenant / deleteTenant`; suspend = read-only + zero outbound (gates WhatsApp/Twilio/push/cron).
- **Storage:** Blob keys `tenant_<id>/…` (per-tenant export/delete).
- **Metrics:** `analytics_events` (tenant/branch scoped); **activation = first Feuille de Caisse saved.**
- **GTM wedge:** back-office cash/stock/staff CONTROL on top of the existing POS; hero = Feuille de Caisse; scarce founding cohort; founder-led + referral; WhatsApp CTA; FR-first.

## Phased roadmap

- **Phase 0 — Monorepo + pre-tenant security (isolation-first).** Stand up the Turborepo/pnpm monorepo; move the live app to `apps/restaurant` (verify same prod deploy); extract `packages/core`; scaffold `apps/saas`. Snapshot live Neon schema + orphan-table migrations. **Spike 1 (make-or-break): RLS correctness on the reused `max:1` pooled connection.** Spike 2: compat-layer tenant injection + leak-test harness. Fix Sentry PII, lock `/api/db/query` + MCP, kill JWT secret. *Nothing multi-tenant ships until Spike 1 passes.*
- **Phase 1 — Multi-tenant core.** tenants/branches/memberships + `tenant_id` on all tables + RLS + billing skeleton + `analytics_events` + `source` column + Blob prefixing; tenant context (ALS/JWT); role→membership; admin split; cron + side-effect gating. **Gate: leak-test suite green.**
- **Phase 2 — Onboarding & console.** invite/accept-invite + activation; onboarding wizard (consent gate → profile → invite → skippable seed → first Feuille de Caisse); super-admin console (request queue, provision, suspend, impersonate, usage); consent capture; empty states.
- **Phase 3 — GTM & pilot launch.** marketing site + FR copy; first-10 outreach playbook; lawyer-reviewed ToS/DPA/Privacy; monitoring + backup + runbooks; onboard cohort 1.
- **Deferred:** billing/payments automation; self-serve signup; subdomains/custom domains; AR/RTL; POS import; branch-switcher UI.

## Top risks
1. Cross-tenant leak (catastrophic) → RLS floor + leak-test gate + lock `/api/db/query`/MCP.
2. RLS-on-pooled-connection correctness (Spike 1) → highest uncertainty; everything gates on it.
3. Live Sentry PII export → fixed in Phase 0.
4. Demand unvalidated → the cohort pilot is the validation.
5. Solo-operator support ceiling ~2–3 onboardings/week (~6–8 concurrent pilot cap) → gates cohort size.
6. Payments dead-end (no Stripe in Morocco) → method-agnostic billing schema.
7. Legal exposure (Law 09-08/CNDP, no docs today) → lawyer before external tenants (D7).

## Team
saas-architect (tech/tenancy) · product-ux (scope/flows/roles/metrics) · growth-gtm (marketing/SEO/content) · business-compliance (monetization/legal) · ops-reliability (operations/reliability). Profiles in `.claude/agents/`; per-profile task checklists in `.claude/kickoff/tasks/`.
