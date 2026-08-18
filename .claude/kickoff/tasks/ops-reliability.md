# ops-reliability — task checklist

Support ceiling: ~2–3 high-touch onboardings/week sustainably; ~6–8 concurrent pilot cap.

## Phase 1–3
- [ ] Tenant lifecycle runbook (provision/suspend/offboard/export/restore) against saas-architect's committed hooks.
- [ ] Define `suspend` = read-only + zero outbound; hand saas the gate list (WhatsApp/Twilio/push + cron-skip-suspended).
- [ ] Blob `tenant_<id>/` layout + per-tenant enumerate/export/delete (compliance erasure dependency).
- [ ] Per-tenant restore procedure (Neon branch-and-filter: restore to new branch at T → FK-ordered `INSERT…SELECT WHERE tenant_id` incl `audit_logs`). Neon Launch 7-day PITR (D9). Rehearse once against a throwaway tenant.
- [ ] Monitoring on Sentry: `tenant_id` tag + PII scrub (list from business-compliance); alerts = per-tenant error spike, uptime/synthetic health check (also warms Neon), quota-approaching vs cost ceiling.
- [ ] Incident/breach response process with real timers (72h breach / 30-day erasure from business-compliance).
- [ ] Impersonation safety spec (time-box/banner/consent/audit) for the super-admin console (with product-ux).
- [ ] Pilot infra-cost envelope: ~$50–70/mo floor (Neon Launch + Vercel Pro + Sentry Team + Blob) + Twilio per-message (flag to business-compliance as billing driver + per-tenant send cap). Monorepo (D1) removes the disk-doubling risk; add prune/`du` guardrails.

Decisions folded in: D9 (7-day PITR); offboard = 30-day soft-delete then purge; pilot support SLA + Twilio cost ownership to confirm with user during Phase 3.
Cross-deps: lifecycle hooks + Blob/suspend gates ← saas-architect; breach deadline + erasure SLA + PII list ← business-compliance; events table + impersonation contract ← product-ux.
