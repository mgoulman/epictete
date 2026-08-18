# product-ux — task checklist

Core loop (invite-gated): WhatsApp request → super-admin provisions → accept-invite/activation → consent gate → onboarding wizard → **first Feuille de Caisse** (= activation event).

## Phase 2
- [ ] Role map: super-admin = platform-level (outside tenant RBAC); owner = tenant-admin + owner flag; manager = manager; staff = finance/marketing/cuisine/rh/serveur/intern; regular = fallback. (Reconciled with saas-architect admin split.)
- [ ] MVP scope doc (in / deferred). Deferred: self-serve signup, billing UI, custom domains, AR/RTL, POS import, branch-switcher UI.
- [ ] Spec **"Demander l'accès" request form** (lead-capture only, provisions nothing; destination aligned with growth-gtm's WhatsApp CTA).
- [ ] Spec **accept-invite / set-password / activation** screen (email verification folded into the invite link).
- [ ] Spec **onboarding wizard** (Stepper component — none exists): consent step 1 (blocking; docs from business-compliance) → restaurant profile → invite team (skippable) → menu/inventory seed (skippable, demoted) → terminal: create first Feuille de Caisse.
- [ ] Spec **super-admin console** as provisioning workbench: access-request queue, provision-tenant action, consent-version enforcement, suspend/reactivate, impersonation surface (policy from ops: time-box/banner/consent/audit), usage panel.
- [ ] Branch model UI = branch switcher in Header, hidden for single-branch tenants; **defer UI build** (D6).
- [ ] Per-module empty states (new tenant = 0 rows everywhere) in FR (EN keys).
- [ ] Success metrics + instrumentation: activation = first cash-sheet saved; time-to-first-cash-sheet; DAU-tenants; retention. **Blocked on saas-architect `analytics_events` (tenant/branch).**

Cross-deps: membership model + `analytics_events` ← saas-architect; consent-capture list (6 points) ← business-compliance; impersonation policy ← ops-reliability; WhatsApp CTA destination ← growth-gtm.
