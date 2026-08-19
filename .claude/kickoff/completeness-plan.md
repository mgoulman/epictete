# SaaS Completeness Plan — from happy-path scaffold to a real product

Synthesis of the product-ux + saas-architect critical audits (2026-08-19). The SaaS has a clean
token foundation and a few good screens (FirstRun is the quality bar), but it is a thin shell: the
entire mature interaction + operations layer the restaurant app already has was never ported, and
"done" has meant "happy path renders." This plan defines the standard and the work to meet it.

## The Definition of Done (the bar every screen + operation must pass)

### Screen DoD
1. Loading = skeleton (`loading.tsx`), not a page spinner.
2. Empty state with the primary CTA **inside** the block.
3. Error state = inline + route `error.tsx`; **never swallow DB errors to 0/null**.
4. Success = **toast** (retire the button-label-flip).
5. Inline field validation (from the shared schema), on blur + submit.
6. Destructive/high-consequence action = **ConfirmDialog**.
7. Buttons: disabled-until-dirty, disabled+spinner while pending, disabled-if-invalid.
8. Small mutations = optimistic/pending, not a blanket `router.refresh()`.
9. Unsaved-changes guard (P0 for the caisse — it loses edits on date change today).
10. Keyboard/focus/a11y: real modals (focus-trap/escape/`role=dialog`), `aria-label` on icon buttons.
11. Responsive verified at 360px.
12. Consistent transitions/micro-interactions.
13. Correct number/date/currency (fix `todayISO()` UTC off-by-one).

### Operation DoD (every mutating route)
1. Shared **zod** schema (client + server, ideally in `packages/core/validation`).
2. `withErrorHandler` + consistent error envelope + correct HTTP codes.
3. `enforce(<perm>)` or `requirePlatformAdmin()` on **every** mutation (caisse POST has none today).
4. **Audit log** row (who/what/when/tenant) — the SaaS writes none today.
5. Idempotency where needed (provision is not idempotent today).
6. Explicit `tenant_id`/ctx predicate (defense-in-depth) on top of RLS.
7. Client: `fetchJson` → toast success/error; confirm on destructive.
8. Input sanitization + enum allow-lists (zod enums).
9. `unsafeQuery` only for pre-context identity lookups — never tenant data.

## Phase 0 — Foundations + critical fixes (P0; everything depends on this)
**Shared infra (build/port once):**
- Port `ToastProvider` → mount in `(app)` and `admin` layouts.
- Port `ConfirmDialog`; build a base `Modal` (overlay/focus-trap/escape) → replace the fake inline panels.
- Port `fetchJson` + `withErrorHandler`/`apiError`; add `error.tsx`/`global-error.tsx`/`not-found.tsx`.
- Add `zod` + shared schemas.
- `audit_logs` table (tenant-scoped, RLS) + audit wiring: AFTER-trigger approach, set `app.user_id`
  alongside `app.tenant_id` in `compat.ts execute()`; thread userId through TenantContext.
- Add Sentry to saas per D8 (includeLocalVariables OFF, PII scrub, tenant_id tag).

**Critical fixes (data-integrity/security/trust):**
- **Per-request tenant-status enforcement** (`middleware.ts` / withTenant) — suspend today only blocks
  login; an existing JWT keeps full access. Highest-severity operational gap.
- **Caisse**: unsaved-changes guard, money validation, toast, dirty-disable, print fallback.
- **caisse POST**: add `finance.write` enforcement + audit (any member can write cash today).
- **Dashboard**: stop swallowing DB errors to 0 → real error surface (finance app must not show fake 0 DH).
- Fix `todayISO()` to local time.
- **Provision idempotency** (dedupe owner email / unique slug + 409).
- Dead controls: wire-or-remove the header Bell + FR/EN toggle; wire-or-remove Stock's "Ajouter" decoy.
- Confirm + toast on revoke / suspend / resend / setStatus (all silent today).

## Phase 1 — Apply the DoD sweep to existing surface (P1)
- Retrofit every existing route+screen (caisse, team, restaurant, consent, provision, tenant-status,
  invite-accept, login) onto the Operation DoD (zod, error handler, toast, confirm, audit, explicit
  tenant predicate) — one PR per route.
- Build **form primitives** (`FormField`/`Select`/`Textarea`/`MoneyInput`/`Checkbox`) with error display.
- Port/adapt **DataTable** (search/sort/pagination); migrate Stock, Users, Admin.
- **Skeletons** + per-route `loading.tsx`.

## Phase 2 — Functional CRUD via a repeatable module recipe (P1→P2)
**Module recipe** (so each module is assembly, not invention): `GET list (?q&sort&page)` + `POST create`
+ `PATCH ?id` + `DELETE ?id` (soft-delete), each `withErrorHandler`+`withTenant`+`enforce(mod.write)`+
zod+audit+explicit tenant predicate; client = DataTable + shared modal form (schema-driven) + Confirm +
toast. Then:
- **Inventory items** full CRUD (wire the dead button) — most glaring non-functional module (P1).
- **Membership management** (change role, deactivate, remove — only invites are manageable today).
- ComingSoon modules via the recipe: **Dépenses, Fournisseurs (+balances), Achats du jour,
  Personnel + Présence, Rapports/exports** — currently 6 hammer placeholders (>half the nav).

## Phase 3 — Complete the account + tenant lifecycle
- **Password reset** (forgot → token → reset) — P0: no recovery = permanent lockout today.
- **Account/Profile page** (`/reglages/compte`: name, password, language) — P0, linked from profile menu.
- **Member self-service**; **email verification** (P1).
- **Admin impersonation** for support (brief-required) + usage drill-down (P1).
- **Tenant offboarding UI** (export + delete; wire the `offboarding` status; 30-day erasure) (P1).
- **Help/support surface** (WhatsApp CTA — fits the cohort) (P1).
- Session management, transfer-ownership, empty-tenant sample data/tour, i18n, dark-mode toggle (P2).

## Prod-hardening (gates the first EXTERNAL tenant; prod cutover already deferred)
- `unsafeQuery` → SECURITY DEFINER fns (session, invite-accept, provision).
- Cross-tenant **leak-test suite** (release gate).
- Blob `tenant_<id>/` prefixing; suspend side-effect gating (cron/webhooks/WhatsApp).

## Cross-profile deps
- audit table/triggers touch `packages/core/src/db` (data-model owner).
- suspend/offboard/impersonation ↔ ops-reliability; export/delete + verification/consent ↔ business-compliance;
  i18n copy ↔ growth-gtm.
