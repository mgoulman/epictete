# Brief — Finance & Rapport enhancements

Status: **Approved 2026-08-13.** Phase 1 in progress.

## Scope: five features

### F1 — Export products table (small)
"Exporter les produits" button on the Inventaire/Achats view. ExcelJS workbook of all
inventory_items: Produit, Catégorie, Unité, Quantité, Coût unitaire, Dernier prix, Fournisseur.
Client-side download.

### F2 — Print → handwrite → scan → OCR → validate → save (large; phased)
- **Free, fully offline OCR** via **digit-box sheet** (one digit per printed box) + a small
  bundled recognizer (OpenCV.js segmentation + MNIST-style ONNX model in-browser). No paid API.
- **Achat** sheet: name + `Prix ▢▢▢▢.▢▢` + `Qté ▢▢▢`. **Sortie** sheet: name + `Qté ▢▢▢`.
- Select a category or all products. Corner registration marks + QR encoding the product/layout
  map so scanned boxes map deterministically to products.
- Capture: **photo (JPG/PNG) AND PDF**. Scans **kept in Vercel Blob** for audit.
- Validated numbers feed the **existing Achat/Sortie flow** (`applyDailyPurchase`) → adjusts stock
  + records inventory_movements. Scan just replaces typing.
- **Phased:** F2a = printable sheet + scan upload + manual-editable validation grid + save
  (usable without recognizer). F2b = plug in offline digit recognizer to pre-fill grid + confidence.
- Price boxes max **9999.99** per line.

### R1 — Named non-cash payment sources (medium)
Dynamic inputs on the cash sheet (e.g. Virement, Chèque): name + amount + "compter avec l'espèce"
toggle. **Calc (confirmed):** cash-in-drawer = CA − CB − Glovo − Σ(sources where toggle OFF).
Sources toggled ON stay counted as cash (not subtracted); OFF behave like CB.
New `payment_sources` JSONB column on cash_sheets + committed migration + save-safe fallback
(same pattern as custom_columns).

### R2 — Custom columns can count against dépense (small)
Per custom column "Compter dans la dépense" toggle (flag inside existing custom_columns JSONB).
ON → column total added to total_depense, subtracted from reste. Reflected in printed sheet.

### R3 — Cleaner uploaded-images display (small)
Responsive thumbnail grid: wrapping fixed tiles, filename on hover, remove button, click-to-enlarge
lightbox, "+N more" past a cap. Frontend only.

## Confirmed decisions
- D1 (R1 math): confirmed — toggle OFF subtracts like CB; ON left in cash.
- D2 (F2 phasing): confirmed — ship F2a first, recognizer in F2b.
- D3 (scan storage): keep scans in Blob for audit.
- D4 (price boxes): max 9999.99 per line.

## Roadmap
1. **Phase 1 (quick wins together):** F1, R2, R3, R1 (one migration).
2. **Phase 2:** F2a — printable digit-box sheet + scan upload + validation grid + save.
3. **Phase 3:** F2b — offline digit recognizer pre-fills grid.

## Risks
- F2 box segmentation reliability depends on print/scan quality; registration marks + QR + digit
  boxes is the proven OMR approach. F2b most likely to need real-world tuning — why F2a stands alone.
- ~10 MB WASM/model for F2b, lazy-loaded only on the F2 screen.

## Directions covered
Problem/Value, Users/Context, Product Scope, Technical, UX, Operations, Risks, Metrics — all
addressed. SEO / Marketing / Monetization / Legal / Physical / Content — N/A (internal, logged-in,
no PII/public surface).
