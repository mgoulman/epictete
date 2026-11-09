import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { SNAPSHOT_PATH, type Snapshot } from '@/lib/site-data';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Regenerates the public site snapshot from Odoo and writes it to Blob.
// Called by the epictete_website addon's save hook (and can be run manually).
// Auth: X-Epictete-Secret must equal ODOO_WEBSITE_SECRET (same shared secret
// the site uses to pull content from Odoo).

interface OdooItem {
  id: number; category_id: number; name: string; name_en: string;
  description: string; description_en: string; price: number;
  is_available: boolean; is_featured: boolean; sequence: number;
  allergens: string[]; tags: string[]; image: string | null; image_filename?: string | null;
}
interface OdooContent {
  ok: boolean;
  menu: { categories: Snapshot['menu']['categories']; items: OdooItem[] };
  sections: Snapshot['sections'];
}

function sniff(buf: Buffer): { ext: string; type: string } {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' };
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: 'png', type: 'image/png' };
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return { ext: 'webp', type: 'image/webp' };
  if (buf.length >= 4 && buf.toString('ascii', 0, 4) === 'GIF8') return { ext: 'gif', type: 'image/gif' };
  return { ext: 'jpg', type: 'image/jpeg' };
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('X-Epictete-Secret');
  const expected = process.env.ODOO_WEBSITE_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const odooUrl = process.env.ODOO_WEBSITE_URL;
  if (!odooUrl) {
    return NextResponse.json({ ok: false, error: 'ODOO_WEBSITE_URL not set' }, { status: 500 });
  }

  // 1. Pull content from Odoo (not cached — we want the latest on publish).
  let content: OdooContent;
  try {
    const res = await fetch(`${odooUrl.replace(/\/$/, '')}/epictete/website/content`, {
      headers: { 'X-Epictete-Secret': expected },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Odoo responded ${res.status}`);
    content = (await res.json()) as OdooContent;
    if (!content.ok) throw new Error('Odoo content not ok');
  } catch (e) {
    return NextResponse.json({ ok: false, error: `odoo fetch failed: ${(e as Error).message}` }, { status: 502 });
  }

  // 2. Mirror each item image (base64 from Odoo) to Blob; replace with its URL.
  let imagesMirrored = 0;
  const items = await Promise.all(
    content.menu.items.map(async (it) => {
      let image: string | null = null;
      if (it.image) {
        try {
          const buf = Buffer.from(it.image, 'base64');
          const { ext, type } = sniff(buf);
          const blob = await put(`site/menu/${it.id}.${ext}`, buf, {
            access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: type,
          });
          image = blob.url;
          imagesMirrored++;
        } catch {
          image = null; // a single bad image must not fail the whole publish
        }
      }
      const { image: _omit, image_filename: _omit2, ...rest } = it;
      void _omit; void _omit2;
      return { ...rest, image };
    })
  );

  // 3. Assemble + write the snapshot to Blob (stable path, public).
  const snapshot: Snapshot = {
    generatedAt: new Date().toISOString(),
    menu: { categories: content.menu.categories, items },
    sections: content.sections,
  };
  try {
    await put(SNAPSHOT_PATH, JSON.stringify(snapshot), {
      access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json',
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: `snapshot write failed: ${(e as Error).message}` }, { status: 500 });
  }

  // The site serves this snapshot via time-based ISR (see lib/site-data.ts).
  // On-demand invalidation (instant propagation) is a follow-up refinement.
  return NextResponse.json({
    ok: true,
    categories: snapshot.menu.categories.length,
    items: items.length,
    imagesMirrored,
    generatedAt: snapshot.generatedAt,
  });
}
