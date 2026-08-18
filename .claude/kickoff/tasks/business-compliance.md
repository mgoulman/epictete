# business-compliance — task checklist

## Phase 0–1 (schema + security inputs)
- [ ] Hand saas-architect the 6 billing entities: `plans`, `subscriptions`(per tenant), `subscription_items`(per branch = billing unit), `invoices`, `payments`(method-agnostic), tenant billing fields (`ice`, `rc`, `billing_email`). Billing unit = branch, billing_owner = tenant-account (D3).
- [ ] Define the exact PII field-scrub list for Sentry `beforeSend` → ops/saas (isolation-first, before any external tenant).

## Phase 2–3 (legal surface)
- [ ] Draft ToS + Privacy Policy + **DPA** (fail-closed DB-RLS isolation clause — now truthful; 72h breach notice; 30-day erasure; sub-processor list: Neon-EU, Sentry, Vercel). Final sign-off ← lawyer (D7).
- [ ] Consent-capture spec → product-ux: `consents(tenant_id, user_id, doc_type, doc_version, accepted_at, ip, user_agent)`; 6 points = ToS, Privacy ack, DPA (owner/signatory), PII processing notice, marketing opt-in (unbundled), impersonation consent.
- [ ] Breach clock 72h + erasure SLA 30-day (+ 30-day soft-delete grace before purge) → ops-reliability.
- [ ] MOWAKABA verdict → growth: PARTIALLY truthful/conditional only — "sous réserve d'éligibilité", package as one-time project; drive Maroc PME/accountant confirmation before any fixed claim.
- [ ] Morocco payments memo (deferred billing): manual collection now (virement + CMI link); automate later via Payzone/ChariBaaS; MoR only if entity becomes EU/US. No payment rail named publicly.
- [ ] Open C4 (Morocco→EU cross-border transfer, CNDP authorization) for the lawyer's scope.

Decisions still user/lawyer-dependent: exact CNDP declaration vs authorization for payroll data; final ToS/DPA sign-off.
Cross-deps: RLS guarantee ← saas-architect; consent screens ← product-ux; erasure mechanics + Blob prefix ← ops-reliability; pricing page ← growth-gtm.
