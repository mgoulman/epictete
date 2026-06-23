# Lead-gen toolkit — corporate-dining outreach (Casablanca Sud)

Build a **verified** B2B email list of industrial companies around Bouskoura /
Ouled Saleh / Casablanca for the corporate-lunch offer — without LinkedIn
scraping. Two complementary tracks:

- **Option A** — find companies (Google Places) → emails (Hunter.io) → verify.
- **Option B** — crawl each company's own website for the emails it publishes
  (`/contact`, `/mentions-legales`). No API key; emails are real by definition.

Everything runs locally with Node 18+ (uses built-in `fetch`, **zero npm installs**).
Outputs land in `out/*.csv` (gitignored). Import the CSV into your Google Sheet.

## Setup
```bash
cd scripts/leadgen
cp .env.example .env      # then paste your keys into .env (gitignored)
```
- `GOOGLE_PLACES_API_KEY` — Google Cloud console → enable **Places API (New)**. Free monthly credit covers a full run.
- `HUNTER_API_KEY` — https://hunter.io/api-keys (free tier is small; cap with `HUNTER_MAX_DOMAINS`).

## Run order
```bash
# 1) Find companies in the target zones  → out/companies.csv + companies_with_domain.csv
node places.mjs

# 2A) Emails via Hunter (domain search + verify)  → out/emails_deliverable.csv
node enrich.mjs

# 2B) Emails crawled from the companies' own sites → out/emails_crawled_ondomain.csv
node crawl.mjs
```
Combine 2A + 2B, dedupe, and you have a clean list. `companies.csv` also has
**phone numbers** — gold for cold-calling, which converts better for a lunch deal.

## Tuning
- Edit `ZONES` / `SECTORS` arrays in `places.mjs` to widen or narrow the catchment.
- `.env`: `HUNTER_MAX_DOMAINS` (quota cap), `HUNTER_VERIFY=0` (skip verify),
  `CRAWL_MAX` / `CRAWL_CONCURRENCY` (site crawler scale).

## Before you send
- Run the final list through a verifier (Hunter does this in `enrich.mjs`; for
  crawled emails use NeverBounce/ZeroBounce) so you only mail valid addresses.
- Send from a **separate domain** with warmup (Instantly/Lemlist), small daily
  volume, personalized.
- **Compliance (Morocco, Law 09-08 / CNDP):** professional addresses only, clear
  opt-out in every email. Keeps you legal and out of spam.

## Why not LinkedIn scraping
LinkedIn doesn't expose emails, scraping breaks its ToS (account bans), and the
underlying data is already sold — cleaned — by the tools above. Skip it.
