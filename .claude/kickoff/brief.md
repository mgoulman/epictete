# Unified Brief v2 — Epictète SaaS → Market-Competitive Product

**Status:** approved by founder 2026-08-23. Supersedes the v1 "one bold differentiator" framing.
Foundation brief (multi-tenant build, approved 2026-08-18) archived in `brief-foundation-archive.md`.
Full visual brief: Artifact "Le Back-Office du Patron" (claude.ai/code/artifact/d0de476a-4b4d-4a58-9756-8f9dedb6fc48).

## The problem restated
The SaaS reads as a stripped-down inheritance of the Epictète restaurant app, not a product built to win
in the market. Goal: make it market-competitive across **three fronts in parallel** — (1) premium design/UX,
(2) the features restaurants need with a Moroccan edge, (3) a real SaaS-owner (platform) console.

## Strategy (approved)
Stay in the **phone-first back-office lane and own it** — the lane every POS-first competitor (QuickCom,
Foodics, POSMARKO, CaisseMaroc, Odoo) leaves empty. Do NOT chase POS / floor plan / KDS / QR menu / delivery /
card rails. Win on: **cash-control (écart) + scanner (marquee)**, **payroll/CNSS + DGI-readiness (the moat
no resto tool touches)**, all at a design bar that makes incumbents look like cash registers.
Positioning: *"Le back-office du patron marocain — contrôle, paie, et conformité, sur ton téléphone. Garde ta caisse."*
Demo = 4 beats: écart → scanner → paie/CNSS → DGI-ready.

## Decisions (defaults confirmed 2026-08-23; D5 still open)
- **D1** Strategy confirmed (phone-first back-office; no POS). ✅
- **D2** Payroll v1 = **monthly-salary-based** + CNSS/AMO → payslip + Damancom export; **full IR in v1.1**. ✅
- **D3** DGI = **readiness / data-shape only** for the pilot (defer clearance API to H2-2026). ✅
- **D4** Payroll = **"assist, owner-verified"; owner submits Damancom** (never auto-file). ✅
- **D5** Pilot city — **STILL OPEN** (blocks GTM outreach only; not blocking build). ⏳
- **D6** Owners count the till nightly — assumed yes; **validate in first pilot convos**. ✅
- **D7** Design-primitives sweep first (the multiplier; M not a rebuild). ✅
- **D8** DGI client-invoicing module = data-shape + scanner now; issuing module later. ✅
- **D9** Add a job-queue dependency (Inngest/QStash) for deadline-bound jobs. ✅
- **D10** Feature-flag granularity = plan-level now, per-tenant override later. ✅
- **D11** Tiers: Essentiel ~200–300 / Pro ~500–700 (Contrôle+scanner+DGI-ready+multi-branch) / Paie add-on ~30–50/employee; free pilot = time-boxed Pro trial. ✅
- **D12** Carry-overs: softer "maîtrise" framing · WhatsApp opt-in + number verification · owner-only digest · scanner→Anthropic under SCCs · start Meta Business verification now · dev/disk consolidation before Phase-2 · ops owns annual barème update. ✅

## Key facts established (round 2)
- **Payroll/CNSS is white space** — no Moroccan resto tool does it (separate category: Paie365, AJIEL).
- **DGI e-invoicing: restaurants are ~post-2028** in the mandate → a **readiness** play, market as future-proofing, NEVER "obligatoire maintenant" (red-line).
- **Design front is cheap** — `apps/saas/components/ui` already a real premium kit; the sweep is mechanical (M), not a rebuild. Freeze it as canonical; don't promote to `packages/core` yet.
- **Payroll has NO engine in the repo today** (staff fields exist; no brut→net). Highest-liability feature: a bad shared rate value = 50 wrong payrolls on a legal deadline. Rates → versioned effective-dated config tables, never code. Ship behind a known-correct payslip test suite + compliance sign-off.
- **One shared append-only "spine"** underpins écart close / payroll runs / legal invoice numbering — one data-model decision, not four.
- **The operator console is the biggest leak surface** — every cross-tenant read via `plt_*`/per-tenant loop; leak-test covers it.

## Sequenced roadmap
- **FLOOR** (with the design-primitives sweep in parallel): Sentry wired · leak-test green (incl. console+digest) · suspend=zero-outbound · soft-delete+30d grace · job queue (retry/dead-letter) · versioned rate tables + payslip test suite · backup + multi-year cold archival · CNDP F211 · DPA/ToS/Privacy (sub-processor annex) · consent + number verification · start Meta verification.
- **P1** Marquee: Contrôle de Caisse (écart verdict on the Feuille de Caisse, append-only close, dashboard écart hero) — in-app, WhatsApp dry-run.
- **P2** Finish the daily loop: Achats/stock-consumption, linked réception fournisseur→stock→dépense, supplier-debt depth, search + exports.
- **P3** SaaS-owner console: tenant health + at-risk, detail drawer, billing views, entitlement gating, job monitor.
- **P4** WhatsApp digest flip + pilot launch (after floor + consent + Meta).
- **P5** Paie/CNSS (behind compliance barème sign-off + test suite).
- **P6** DGI-ready invoicing data-shape (+ client-invoicing module if D8 flips).
- **Fast-follow:** invoice scanner (OCR port, owner-confirmed triple-write).
- **Deferred:** DGI clearance-API · full offline (feasibility TBD) · inbound WhatsApp capture · self-serve signup · AR/RTL · recipes/food-cost.

## Top risks
1. Payroll blast radius (bad rate table = 50 wrong payrolls) → versioned tables + test suite + owner-submit. CATASTROPHIC.
2. Cross-tenant leak (console widens the surface) → plt_*/loop + leak-test covers console. CATASTROPHIC.
3. Scope vs solo-operator ceiling → sequenced, marquee first, heavy modules after the loop is trustworthy. DELIVERY.
4. Offline parity gap → architect feasibility spike or counter-message. HIGH.
5. Payroll/tax retention > 7-day PITR → immutable cold archival. HIGH.
6. Owners don't count the till → validate (D6). MEDIUM.
7. Meta verification lead time → start now. SCHEDULE.

## Red-lines (never build)
No "réel vs déclaré"/declared-salary field · no mutable cash/payroll/invoice history · full-brut payroll only · no "cachez du cash / optimisation fiscale" marketing, no DGI "obligatoire maintenant" false urgency.

## Team (unchanged, mandates expanded)
saas-architect · product-ux · growth-gtm · business-compliance · ops-reliability. Per-profile v2 task lists in `tasks/v2-competitive-plan.md`.

---

# Odoo Migration (apps/restaurant) — kickoff started 2026-09-19

**Status:** Approved incrementally by the founder in direct conversation across 2026-09-19 → 2026-09-23 (foundational decisions, team, defaults, till-decision reversal, and each build step were each explicitly confirmed as they came up, rather than as one single sign-off moment). This section is the retroactive persisted record of that approval — **separate scope from the SaaS brief above; apps/saas is untouched by this track.**

## Scope
Replace `apps/restaurant`'s custom web app/backoffice entirely with self-hosted Odoo 19.0 Enterprise (friend Eljaouhari's Hetzner server, `95.217.232.11`, Helsinki/EU datacenter — confirmed, resolves the Law 09-08 foreign-transfer question favorably). Public landing page stays as-is, untouched. `apps/saas` is unaffected.

## Confirmed decisions
- **A. Edition/custom dev:** Enterprise (already live in prod, confirmed 19.0+e), targeted custom modules only where no native/marketplace fit exists.
- **B. Hosting:** friend's Hetzner box, founder now has full API + SSH access (own deploy key installed, `odoo/.ssh/odoo_deploy_key`, gitignored). Founder-held credentials still pending for the Hetzner *account* itself and prod domain control.
- **C. Timeline:** parallel-run pilot, no hard cutover date. Ops sequencing (dev→test→prod, inventory-first, salle-last) still the working default.
- **D. Data migration:** superseded 2026-09-23 — founder explicitly requested a real pull of production data (Neon `neondb`, the actual `apps/restaurant` runtime DB — corrects the earlier "Supabase" assumption) into the local Odoo dev environment, scoped to inventory/recipes/purchasing/accounting first. Fresh-start-archive default no longer holds for this slice.
- **Till decision (new, 2026-09-23):** Odoo POS becomes the real till. **LaCaisse.ma is fully retired**, not run in parallel. This unlocked `pos_restaurant` (Community, free) as the native table/floor-management fit.

## Team
`odoo-migration-architect` (big, technical), `odoo-product-scope`, `odoo-ux-parity`, `odoo-ops-cutover`, `odoo-legal-vendor-risk` — profiles in `.claude/agents/odoo-*.md`. Full team-spec detail in `team-spec.md` (Odoo section).

## What's been validated (local Odoo 19 Enterprise, Docker, byte-identical Enterprise addons pulled from the friend's server)
Full caisse-to-reporting cycle run live end to end with real ORM calls, zero custom code: POS session → table order → kitchen display → split payment → session close (native écart/cash-difference accounting) → stock deduction via recipe BoM → reorder rule → auto PO → receipt → vendor bill → posted to GL (Moroccan chart of accounts, MAD, 20% TVA already configured). `pos_hr` gives native 3-tier role access (cashier/waiter/full).

Refined module-mapping resolved most of the original "needs custom dev" list to native fits: Approvals, Audit log (OCA `auditlog`, installed), Memos (`project_todo`), WhatsApp notifications, Invoice OCR, Recipes/costing (`mrp`+`pos_mrp`, Community not Enterprise), Salle (`pos_restaurant`, Community), Payroll (`l10n_ma_hr_payroll` confirmed present and functional).

**Still genuinely custom:** Transport (staff shuttle dispatch) — no marketplace/OCA fit found, needs a bespoke screen on top of Planning+Fleet.

**Still open / Decisions Needed:** Reservations (simple webhook vs. real booking widget — apps/restaurant's current `/reservation` is just a WhatsApp lead form, not a table-booking UI); whether Payroll is actually in scope for the pilot (apps/restaurant never had this feature before); CNDP filings (F211 domestic + F118 foreign-transfer, now likely the lighter path given the EU datacenter); written agreement with Eljaouhari (9 required elements, drafted not signed); founder-held Hetzner account + prod domain control.

## Environment state (as of 2026-09-23)
Local Odoo 19 Enterprise running (`odoo/docker-compose.yml`, db `odoo_epictete`), 255+ modules installed matching the validated set. Pushed to the remote **test** environment only (`epictete_test` db) — prod and dev untouched. A version-skew bug (`pos_settle_due` vs. Community's native equivalent) was found and fixed locally by uninstalling the redundant Enterprise module; not yet confirmed whether it recurs on the remote test instance.

## In flight (authorized 2026-09-23)
Building the RBAC module (mapping the real 8-role model — admin/manager/finance/marketing/cuisine/rh/serveur/intern, read from Neon's `roles`/`permissions`/`role_permissions` tables — onto Odoo's group/access model), migrating real inventory/recipes/purchasing/accounting data from the production Neon database into the local Odoo instance, and writing a Playwright test suite covering all 8 roles across inventory→recipes→purchasing→accounting flows. Founder provided the live Neon connection string directly in conversation and explicitly chose "pull the real data now" over synthetic test data, aware this predates the CNDP filing.
