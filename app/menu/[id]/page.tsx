import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { type MenuTag } from "@/lib/menu-types";
import { query } from "@/lib/db";
import { DishView, type RelatedDish } from "./DishView";

export const dynamic = "force-dynamic";

type Row = {
  id: string; name: string; name_fr: string | null; price: string | number;
  description: string | null; ingredients: unknown; tags: unknown;
  category_id: string | null; image_url: string | null;
  is_signature: boolean | null; chef_note: string | null;
};
type CatRow = { id: string; name_fr: string | null; name: string | null };

function toArr(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === "string") { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
}

async function getDish(id: string) {
  const { rows } = await query(
    `SELECT id,name,name_fr,price,description,ingredients,tags,category_id,image_url,is_signature,chef_note
     FROM menu_items WHERE id=$1 AND is_available=true LIMIT 1`, [id]
  );
  const item = rows[0] as Row | undefined;
  if (!item) return null;
  const { rows: catRows } = await query(
    `SELECT id,name_fr,name FROM menu_categories WHERE id=$1`, [item.category_id]
  );
  const cat = (catRows[0] as CatRow | undefined) ?? null;
  const { rows: related } = await query(
    `SELECT id,name,name_fr,price,image_url FROM menu_items
     WHERE category_id=$1 AND id<>$2 AND is_available=true AND image_url IS NOT NULL AND image_url<>''
     ORDER BY sort_order NULLS LAST, name LIMIT 3`, [item.category_id, id]
  );
  return { item, cat, related: related as RelatedDish[] };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await getDish(id);
  if (!data) return { title: "Plat introuvable | Epictete" };
  const nm = data.item.name_fr || data.item.name;
  return {
    title: `${nm} | Epictete Restaurant`,
    description: data.item.description || `${nm} — Epictete, cuisine italienne à Bouskoura.`,
    openGraph: data.item.image_url ? { images: [data.item.image_url] } : undefined,
  };
}

export default async function DishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getDish(id);
  if (!data) notFound();
  const { item, cat, related } = data;
  const catLabel = cat?.name_fr || cat?.name || "Notre Carte";
  const backHref = item.category_id ? `/menu#category-${item.category_id}` : "/menu";

  return (
    <>
      <Header hideThemeToggle />
      <DishView
        name={item.name_fr || item.name}
        catLabel={catLabel}
        price={Number(item.price)}
        description={item.description}
        ingredients={toArr(item.ingredients)}
        tags={toArr(item.tags) as MenuTag[]}
        image={item.image_url}
        isSignature={!!item.is_signature}
        chefNote={item.chef_note}
        related={related}
        backHref={backHref}
      />
      <Footer />
    </>
  );
}
