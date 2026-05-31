// Export the LaCaisse → Recipe mapping state to an Excel for review.
// 3 sheets: 'Linked' (mapped), 'Unlinked' (need attention), 'Recipes available'.
import ExcelJS from 'exceljs';
import { Client } from 'pg';
import { readFileSync, mkdirSync } from 'fs';

for (const line of readFileSync('/Users/macbook/Desktop/epictelerestaurant/.env.local', 'utf8').split('\n')) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  const k = line.slice(0, i).trim();
  if (!process.env[k]) process.env[k] = line.slice(i + 1).trim();
}

const db = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'slowbob',
  password: process.env.DB_PASSWORD || 'slowbob',
  database: process.env.DB_NAME || 'epictete_db',
});
await db.connect();

// Linked (mapped) dishes — all date ranges
const { rows: linked } = await db.query(`
  SELECT
    s.clean_name AS lacaisse_name,
    r.name AS recipe_name,
    r.name_fr AS recipe_name_fr,
    ROUND(r.cost_price::numeric, 2)::float AS cost_price,
    m.source,
    m.similarity::float AS similarity,
    s.qty_sold,
    s.revenue
  FROM (
    SELECT TRIM(BOTH ' -' FROM product_name) AS clean_name,
           SUM(quantity)::int AS qty_sold,
           ROUND(SUM(selling_price)::numeric, 2)::float AS revenue
      FROM sales_items WHERE import_source = 'lacaisse_dashboard'
     GROUP BY 1
  ) s
  JOIN sales_cost_map m ON m.product_name = s.clean_name
  LEFT JOIN recipes r ON r.id = m.recipe_id
  ORDER BY s.revenue DESC
`);

// Unlinked dishes — sold but no mapping
const { rows: unlinked } = await db.query(`
  SELECT
    s.clean_name AS lacaisse_name,
    s.qty_sold,
    s.revenue,
    fuzzy.recipe_name AS suggested_recipe,
    fuzzy.recipe_name_fr AS suggested_recipe_fr,
    fuzzy.cost_price::float AS suggested_cost,
    ROUND(fuzzy.sim::numeric, 2)::float AS suggested_similarity
  FROM (
    SELECT TRIM(BOTH ' -' FROM product_name) AS clean_name,
           SUM(quantity)::int AS qty_sold,
           ROUND(SUM(selling_price)::numeric, 2)::float AS revenue
      FROM sales_items WHERE import_source = 'lacaisse_dashboard'
     GROUP BY 1
  ) s
  LEFT JOIN sales_cost_map m ON m.product_name = s.clean_name
  LEFT JOIN LATERAL (
    SELECT name AS recipe_name, name_fr AS recipe_name_fr, cost_price,
           GREATEST(similarity(s.clean_name, name), similarity(s.clean_name, COALESCE(name_fr, ''))) AS sim
      FROM recipes WHERE cost_price > 0 ORDER BY sim DESC LIMIT 1
  ) fuzzy ON true
  WHERE m.product_name IS NULL
  ORDER BY s.revenue DESC
`);

// Recipes that have cost but aren't linked to anything
const { rows: orphanRecipes } = await db.query(`
  SELECT r.name, r.name_fr, ROUND(r.cost_price::numeric, 2)::float AS cost_price, r.selling_price
    FROM recipes r
   WHERE r.cost_price > 0
     AND r.id NOT IN (SELECT recipe_id FROM sales_cost_map WHERE recipe_id IS NOT NULL)
   ORDER BY r.cost_price DESC
`);

await db.end();

const wb = new ExcelJS.Workbook();
wb.creator = 'Epictete';
wb.created = new Date();

// ── Linked ──
const linkedSh = wb.addWorksheet('Linked', { views: [{ state: 'frozen', ySplit: 1 }] });
linkedSh.columns = [
  { header: 'LaCaisse name (sold)',    key: 'lacaisse_name',    width: 38 },
  { header: 'Recipe name',             key: 'recipe_name',      width: 32 },
  { header: 'Recipe name (FR)',        key: 'recipe_name_fr',   width: 32 },
  { header: 'Cost / portion (DH)',     key: 'cost_price',       width: 18, style: { numFmt: '#,##0.00' } },
  { header: 'Source',                  key: 'source',           width: 12 },
  { header: 'Similarity',              key: 'similarity',       width: 12, style: { numFmt: '0.00' } },
  { header: 'Qty sold',                key: 'qty_sold',         width: 10 },
  { header: 'Revenue (DH)',            key: 'revenue',          width: 14, style: { numFmt: '#,##0.00' } },
];
linked.forEach(r => linkedSh.addRow(r));

// ── Unlinked ──
const unlinkedSh = wb.addWorksheet('Unlinked', { views: [{ state: 'frozen', ySplit: 1 }] });
unlinkedSh.columns = [
  { header: 'LaCaisse name (sold)',         key: 'lacaisse_name',          width: 38 },
  { header: 'Qty sold',                     key: 'qty_sold',               width: 10 },
  { header: 'Revenue (DH)',                 key: 'revenue',                width: 14, style: { numFmt: '#,##0.00' } },
  { header: 'Suggested recipe',             key: 'suggested_recipe',       width: 32 },
  { header: 'Suggested recipe (FR)',        key: 'suggested_recipe_fr',    width: 32 },
  { header: 'Suggested cost (DH)',          key: 'suggested_cost',         width: 16, style: { numFmt: '#,##0.00' } },
  { header: 'Similarity',                   key: 'suggested_similarity',   width: 12, style: { numFmt: '0.00' } },
];
unlinked.forEach(r => unlinkedSh.addRow(r));

// ── Orphan recipes ──
const recipesSh = wb.addWorksheet('Recipes (unlinked)', { views: [{ state: 'frozen', ySplit: 1 }] });
recipesSh.columns = [
  { header: 'Recipe name',         key: 'name',          width: 32 },
  { header: 'Recipe name (FR)',    key: 'name_fr',       width: 32 },
  { header: 'Cost / portion (DH)', key: 'cost_price',    width: 18, style: { numFmt: '#,##0.00' } },
  { header: 'Selling price',       key: 'selling_price', width: 14 },
];
orphanRecipes.forEach(r => recipesSh.addRow(r));

// Style headers
for (const sh of [linkedSh, unlinkedSh, recipesSh]) {
  const h = sh.getRow(1);
  h.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF606338' } };
}

mkdirSync('/Users/macbook/Desktop/epictelerestaurant/exports', { recursive: true });
const out = '/Users/macbook/Desktop/epictelerestaurant/exports/cost_mapping_state.xlsx';
await wb.xlsx.writeFile(out);

console.log(`Linked  : ${linked.length}`);
console.log(`Unlinked: ${unlinked.length}`);
console.log(`Orphan recipes (have cost, not linked): ${orphanRecipes.length}`);
console.log(`Wrote ${out}`);
