// Blob-first site content read layer.
//
// The source of truth is Odoo (epictete_website addon). /api/publish pulls from
// Odoo, mirrors images to Vercel Blob, and writes a single JSON snapshot to Blob
// at `site/snapshot.json`. The public site reads THAT snapshot here — never Odoo
// at request time — so Odoo being down is invisible to visitors. Reads hit the
// public Blob URL (no token needed); only publishing needs BLOB_READ_WRITE_TOKEN.

import 'server-only';

const BASE = (process.env.BLOB_BASE_URL || '').replace(/\/$/, '');
export const SNAPSHOT_PATH = 'site/snapshot.json';
export const SNAPSHOT_URL = BASE ? `${BASE}/${SNAPSHOT_PATH}` : '';

// How long a cached snapshot is served before a background refresh. On-demand
// revalidation (the Odoo save webhook -> /api/revalidate) makes edits appear
// sooner; this is the safety-net ceiling.
const REVALIDATE_SECONDS = 300;

export interface SnapshotCategory {
  id: number;
  name: string;
  name_en: string;
  sequence: number;
}
export interface SnapshotItem {
  id: number;
  category_id: number;
  name: string;
  name_en: string;
  description: string;
  description_en: string;
  price: number;
  is_available: boolean;
  is_featured: boolean;
  sequence: number;
  allergens: string[];
  tags: string[];
  image: string | null; // Blob URL (or null)
}
export interface SnapshotSection {
  fr: Record<string, string>;
  en: Record<string, string>;
  reviews?: Array<{ name: string; role: string; content: string; source: string; rating: number }>;
}
export interface Snapshot {
  generatedAt: string;
  menu: { categories: SnapshotCategory[]; items: SnapshotItem[] };
  sections: Record<string, SnapshotSection>;
}

const EMPTY: Snapshot = { generatedAt: '', menu: { categories: [], items: [] }, sections: {} };

/**
 * Read the published snapshot from Blob (ISR-cached). Returns an empty snapshot
 * (never throws) if the snapshot is missing or Blob is unreachable, so pages
 * always render — falling back to their i18n defaults where content is absent.
 */
export async function getSnapshot(): Promise<Snapshot> {
  if (!SNAPSHOT_URL) return EMPTY;
  try {
    const res = await fetch(SNAPSHOT_URL, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ['site-content'] },
    });
    if (!res.ok) return EMPTY;
    const data = (await res.json()) as Snapshot;
    return {
      generatedAt: data.generatedAt || '',
      menu: { categories: data.menu?.categories || [], items: data.menu?.items || [] },
      sections: data.sections || {},
    };
  } catch {
    return EMPTY;
  }
}

// ── Shape adapters: map the snapshot to the shapes the existing site code expects ──

/** Rows in the `/api/site-content` shape: { section, content: { fr, en, reviews? } }. */
export async function getSectionRows(): Promise<Array<{ section: string; content: SnapshotSection }>> {
  const snap = await getSnapshot();
  return Object.entries(snap.sections).map(([section, content]) => ({ section, content }));
}

/** Menu categories in the legacy `menu_categories` row shape. */
export async function getMenuCategoryRows() {
  const snap = await getSnapshot();
  return snap.menu.categories.map((c) => ({
    id: c.id,
    name: c.name,
    name_fr: c.name,          // Odoo stores French-primary in `name`
    name_en: c.name_en || null,
    icon: null,
    description: null,
    display_order: c.sequence,
    sort_order: c.sequence,
    is_active: true,
    availability_type: 'always',
    available_start_time: null,
    available_end_time: null,
    available_days: null,
  }));
}

/** Menu items in the legacy `menu_items` row shape. */
export async function getMenuItemRows() {
  const snap = await getSnapshot();
  return snap.menu.items.map((i) => ({
    id: i.id,
    name: i.name,
    name_fr: i.name,
    name_en: i.name_en || null,
    description: i.description || '',
    description_fr: i.description || '',
    description_en: i.description_en || '',
    price: i.price,
    price_small: null,
    price_medium: null,
    price_large: null,
    category_id: i.category_id,
    image_url: i.image || null,
    is_available: i.is_available,
    is_featured: i.is_featured,
    display_order: i.sequence,
    sort_order: i.sequence,
    allergens: i.allergens || [],
    tags: i.tags || [],
    ingredients: null,
    ingredients_en: null,
    spicy_level: null,
    prep_time: null,
    is_signature: i.is_featured,
    chef_note: null,
    recipe_id: null,
    extra_category_ids: null,
  }));
}
