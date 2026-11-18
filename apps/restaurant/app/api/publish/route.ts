import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { SNAPSHOT_PATH, SNAPSHOT_URL, type Snapshot, type SnapshotItem } from '@/lib/site-data';

export const runtime = 'nodejs';
export const maxDuration = 300;

// Regenerates the public site snapshot from Odoo and writes it to Blob.
// Called by the epictete_website addon's save hook (and can be run manually).
// Auth: X-Epictete-Secret must equal ODOO_WEBSITE_SECRET (same shared secret
// the site uses to pull content from Odoo).
//
// Images are NOT inlined in the Odoo content payload (that made it ~13 MB and
// the fetch timed out). Odoo sends only `has_image` + `image_hash`; we pull each
// image from /epictete/website/image?id=<id> ONLY when its hash changed since the
// last snapshot, and reuse the existing Blob URL otherwise.

interface OdooItem {
  id: number; category_id: number; name: string; name_en: string;
  description: string; description_en: string; price: number;
  is_available: boolean; is_featured: boolean; sequence: number;
  allergens: string[]; tags: string[];
  has_image: boolean; image_hash: string | null;
}
interface OdooContent {
  ok: boolean;
  menu: { categories: Snapshot['menu']['categories']; items: OdooItem[] };
  sections: Snapshot['sections'];
}

// Run async tasks with bounded concurrency so we never fire ~130 image requests
// at Odoo at once.
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
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

  // 1b. Read the previous snapshot so we can reuse images whose hash is unchanged
  // (avoids re-downloading/re-uploading every image on every publish).
  const prevById = new Map<number, { image: string | null; hash: string | null }>();
  if (SNAPSHOT_URL) {
    try {
      const prevRes = await fetch(SNAPSHOT_URL, { cache: 'no-store' });
      if (prevRes.ok) {
        const prev = (await prevRes.json()) as Snapshot;
        for (const it of prev.menu?.items || []) {
          prevById.set(it.id, { image: it.image ?? null, hash: it.image_hash ?? null });
        }
      }
    } catch {
      // no previous snapshot (or unreachable) → mirror everything fresh
    }
  }

  // 2. Resolve each item's image: reuse the Blob URL when the hash matches the last
  // publish, otherwise pull the raw bytes from Odoo (per item) and mirror to Blob.
  let imagesMirrored = 0;
  const imageBase = `${odooUrl.replace(/\/$/, '')}/epictete/website/image`;
  const items: SnapshotItem[] = await mapLimit(content.menu.items, 6, async (it) => {
    const { has_image, image_hash, ...rest } = it;
    const prev = prevById.get(it.id);
    let image: string | null = null;

    if (has_image) {
      const unchanged = !!prev?.image && prev.hash === image_hash && image_hash !== null;
      if (unchanged) {
        image = prev!.image; // same image as last time → keep its Blob URL, no fetch
      } else {
        try {
          const imgRes = await fetch(`${imageBase}?id=${it.id}`, {
            headers: { 'X-Epictete-Secret': expected },
            cache: 'no-store',
          });
          if (!imgRes.ok) throw new Error(`image ${it.id} → ${imgRes.status}`);
          const buf = Buffer.from(await imgRes.arrayBuffer());
          const { ext, type } = sniff(buf);
          const blob = await put(`site/menu/${it.id}.${ext}`, buf, {
            access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: type,
          });
          image = blob.url;
          imagesMirrored++;
        } catch {
          // a single bad image must not fail the publish → keep the old URL if any
          image = prev?.image ?? null;
        }
      }
    }
    return { ...rest, image, image_hash: image_hash ?? null };
  });

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
