## Overview

Next.js 16 app for Epictete Restaurant containing:

- `/` – main-domain placeholder (“Website coming soon”).
- `/menu` – full-screen PDF viewer for `public/menu.pdf`, with fallback download link.

## Local development

```bash
npm install
npm run dev
```

Visit:

- `http://localhost:3000/` for the placeholder page.
- `http://localhost:3000/menu` for the embedded menu.

## Updating the PDF menu

1. Replace `public/menu.pdf` with the new file (keep the same filename to avoid URL changes).
2. Commit the asset if you want it in version control, or upload directly in Vercel if preferred.
3. Redeploy (Next.js will serve the new file automatically).

## Deploying on Vercel with custom domains

1. Push this repo to GitHub (or another Git provider) and import it in [Vercel](https://vercel.com/import).
2. During the import, Vercel detects `next build` automatically—no extra config needed.
3. After the first deployment, add domains in **Settings → Domains**:
   - `epictelerestaurant.ma` → set as primary.
   - `menu.epictelerestaurant.ma` → add as an additional domain pointing to the same project.
4. In your DNS provider, create the required `A`/`CNAME` records that Vercel shows. SSL certs issue automatically.
5. Once DNS propagates, both `https://epictelerestaurant.ma/` and `https://menu.epictelerestaurant.ma/` will serve the respective routes.

### Hostinger DNS steps (example)

1. Log into Hostinger → **hPanel → Domains → DNS / Nameservers**.
2. Under **DNS Zone (A records)** delete any existing A record for `@`, then add:
   - **Type:** A
   - **Host:** `@`
   - **Points to:** `76.76.21.21` (Vercel edge IP for apex domains)
   - **TTL:** leave default (e.g., 14400 s)
3. Under **CNAME (Aliases)** add the menu subdomain:
   - **Type:** CNAME
   - **Host:** `menu`
   - **Points to:** `cname.vercel-dns.com` (or the exact target Vercel shows under the menu domain)
   - **TTL:** default
4. Save changes. Propagation can take up to an hour, but usually finishes sooner.
5. Back in Vercel’s domain settings, run the “Verify” button for each domain. Once validated, both domains automatically receive SSL certificates.

## Notes

- Change texts/branding in `app/page.tsx`.
- Adjust the menu page layout or styling in `app/menu/page.tsx`.
- Keep static assets lightweight when possible (the current PDF is ~150 MB; consider compressing for faster mobile loads).
