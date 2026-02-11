## Overview
Epictete
Next.js 16 app for Epictete Restaurant containing:
adib maachi bel adaab 
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

## Deploying on Vercel with Hostinger DNS

1. Push this repo to GitHub (or another Git provider) and import it in [Vercel](https://vercel.com/import).
2. During import Vercel auto-detects `next build`.
3. After the first deployment, open **Project → Settings → Domains** and add:
   - `epictetelerestaurant.ma` (mark as Primary Domain).
   - `menu.epictetelerestaurant.ma` (route handled by `/menu`).
4. Leave Vercel open—it will show the DNS records it expects.

### Configure Hostinger DNS

1. hPanel → **Domains → epictetelerestaurant.ma → DNS / Nameservers**.
2. **Apex domain (`epictetelerestaurant.ma`)**
   - Remove any existing `A` record with host `@`.
   - Add new record:
     - Type: **A**
     - Host: `@`
     - Points to: `76.76.21.21` (Vercel edge IP)
     - TTL: default (e.g., 14400 sec)
3. **Menu subdomain (`menu.epictetelerestaurant.ma`)**
   - Remove conflicting records for host `menu`.
   - Add new record:
     - Type: **CNAME**
     - Host: `menu`
     - Points to: `cname.vercel-dns.com` *(or the exact target Vercel shows—copy/paste it)*
     - TTL: default
4. Save Hostinger DNS changes. Propagation usually finishes within minutes but can take up to 1 hour.

### Verify in Vercel

1. Return to **Vercel → Project → Settings → Domains**.
2. Click **Verify** next to each domain. Vercel will detect the new DNS records and issue SSL certificates automatically.
3. Once DNS propagates, both `https://epictetelerestaurant.ma/` and `https://epictetelerestaurant.ma/` serves the landing page.
- `https://menu.epictetelerestaurant.ma/` loads the PDF viewer immediately.

## Notes

- Change texts/branding in `app/page.tsx`.
- Adjust the menu page layout or styling in `app/menu/page.tsx`.
- Keep static assets lightweight when possible. The production menu now lives at `public/menu-optimized.pdf` (~4 MB), so replacing it is as simple as swapping that file and redeploying.
- The `/menu` route shows a spinner while the PDF loads on desktop and includes a mobile hint to download the PDF if the inline viewer feels sluggish.
