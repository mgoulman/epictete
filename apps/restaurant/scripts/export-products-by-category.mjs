// Simple export: every product name grouped by category in one sheet.
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

const { rows } = await db.query(`
  SELECT
    COALESCE(c.name, '(sans catégorie)') AS category,
    i.name
  FROM inventory_items i
  LEFT JOIN inventory_categories c ON c.id = i.category_id
  ORDER BY category, i.name
`);
await db.end();

const wb = new ExcelJS.Workbook();
wb.creator = 'Epictete Restaurant';
wb.created = new Date();

const sh = wb.addWorksheet('Produits', { views: [{ state: 'frozen', ySplit: 1 }] });
sh.columns = [
  { header: 'Catégorie', key: 'category', width: 28 },
  { header: 'Produit',   key: 'name',     width: 40 },
];

const header = sh.getRow(1);
header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF606338' } };
header.alignment = { vertical: 'middle' };

let lastCat = null;
for (const r of rows) {
  const row = sh.addRow({ category: r.category, name: r.name });
  if (r.category === lastCat) {
    // hide repeated category cell visually so groups read as blocks
    row.getCell('category').value = '';
  } else if (lastCat !== null) {
    // separator line between categories
    sh.addRow([]);
  }
  lastCat = r.category;
}

sh.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 2 } };

mkdirSync('/Users/macbook/Desktop/epictelerestaurant/exports', { recursive: true });
const outPath = '/Users/macbook/Desktop/epictelerestaurant/exports/produits_par_categorie.xlsx';
await wb.xlsx.writeFile(outPath);
console.log(`Wrote ${rows.length} products → ${outPath}`);
