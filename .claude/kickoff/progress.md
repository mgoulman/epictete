# Progress log

## 2026-08-13 — Kickoff approved, Phase 1 started
- Brief approved by user. Decisions D1–D4 confirmed.
- Ran lean (no separate sub-agent profiles) by agreement — single implementer across backend/frontend/OCR.
- Phase 1 = F1, R2, R3, R1. Beginning implementation.

## 2026-08-13 — Phase 1 complete (all four, verified)
- **F1** (`finance/page.tsx`): `exportInventoryExcel` + "Exporter" button in the Inventaire toolbar.
  Verified: click downloads `produits_YYYY-MM-DD.xlsx`.
- **R1** (`reports/page.tsx` + `api/reports/cash-sheets/route.ts` + migration
  `20260813010000_cash_sheet_payment_sources.sql`): `payment_sources` JSONB, "Autres encaissements"
  UI, calc `cash = CA − CB − Glovo − Σ(sources OFF)`, generalized save-safe fallback, PDF prints sources.
  Migration applied to **Neon prod + local dev**. Verified via API: CA 1000 + source 100 OFF → caisse 900;
  source 50 ON not subtracted; persists through save/reload.
- **R2** (`reports/page.tsx` + route): per-column `count_as_depense` flag + "Compter dans la dépense"
  toggle + per-column total. Calc adds flagged columns to dépense. Verified: dépense 20+50=70, reste 830;
  flag persists.
- **R3** (`reports/page.tsx`): attachments reworked — count badge, collapsed to 12 w/ "+N", lightbox on
  image click, PDFs open new tab, clean empty state.
- tsc: 0 errors. eslint: 0 errors (pre-existing warnings only). Verified in dev via Playwright + API.
- NOT yet committed/pushed.
- **User directive (2026-08-13): do NOT commit anything until ALL phases (1, 2, 3) are finished.**
  Everything stays staged in the working tree; single commit batch at the end.
- **Next:** Phase 2 (F2a — printable digit-box sheet + scan upload + validation grid + save).

## 2026-08-14 — Phase 2 (F2a) complete + verified
- New `components/backoffice/inventory/StockCountSheet.tsx`; mounted as a **"Comptage" tab** in
  Achats & Stock (`inventory/page.tsx`: TabKey + tab button + render).
- Setup: mode (achat/sortie) + scope (category/all) + date.
- **Print**: A4 digit-box sheet — achat `Prix ▢▢▢▢.▢▢ + Qté ▢▢▢▢.▢`, sortie `Qté` only; QR (compact
  descriptor {v,mode,date,scope,sort,n} — NOT raw UUIDs, which overflowed the QR) + 4 corner
  registration marks. `qrcode` dep added.
- **Scan**: upload photo/PDF → Vercel Blob (`uploadFile(..,'stock-counts')`), kept for audit; url
  appended to movement notes.
- **Validation grid**: editable Prix/Qté per product; save → existing `daily-purchase`/`daily-usage`
  endpoints (stock + movements, approval gate respected).
- Verified via Playwright + DB: print renders all 210 products (QR/boxes/marks ok); grid 210 rows;
  save created a `daily_purchase` movement (qty 7 @ 12.5) — cleaned up. tsc 0 errors; new component
  lint-clean (pre-existing line-175 picker error untouched).
- Bug found & fixed during test: QR "data too big" for 210 UUIDs → switched to compact descriptor.
- **Next:** Phase 3 (F2b — offline digit recognizer to pre-fill the grid). NEEDS a checkpoint:
  requires bundling OpenCV.js + an ONNX MNIST model + jsQR, and real scanned sheets to tune accuracy.

## 2026-08-14 — UI polish (R1/R2 controls) + local DB sync
- Added a reusable `ToggleSwitch` (olive/orange variants) in `reports/page.tsx`. Replaced the raw
  checkboxes on R1 (payment-source "Espèce") and R2 (custom-column "Compter dans la dépense") with
  pill toggle switches. R1 rows redesigned into bordered pill rows: borderless name input,
  amount input with "DH" suffix, toggle, delete. Verified visually (Virement OFF deducts, Pourboire
  ON kept as cash → "Déduit du CA : 300,00 DH"). tsc 0 errors; lint 0 errors.
- Fixed user's local dev DB: applied salle_floorplan + attendance + table_reservations migrations
  (were missing → /api/salle and /api/presence/summary 500s). Now 200. Unrelated to our features;
  no prod/Neon change.
- F2b decision: user chose "test F2a first, then tune F2b" — F2b ON HOLD pending real scanned sheets.
- User's dev server runs on :3000. Everything still uncommitted per directive.
