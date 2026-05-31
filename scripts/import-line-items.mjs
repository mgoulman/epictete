// Pull the LaCaisse Excel export for caisse=3349 (Epictete) and upsert into sales_items.
// Tags rows with import_source='lacaisse_dashboard' so the previous broken set
// (already wiped) can't be confused with this one.
import { Client } from 'pg';
import { readFileSync } from 'fs';

for (const line of readFileSync('/Users/macbook/Desktop/epictelerestaurant/.env.local', 'utf8').split('\n')) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  const k = line.slice(0, i).trim();
  if (!process.env[k]) process.env[k] = line.slice(i + 1).trim();
}

const { authenticate, fetchLineItems, resolveCaisseId } = await import('../lib/lacaisse/dashboard.ts');

const startDate = process.argv[2] || '2025-10-04';
const endDate = process.argv[3] || new Date().toISOString().slice(0, 10);
console.log('Range:', startDate, '→', endDate);

const auth = await authenticate(process.env.LACAISSE_LOGIN, process.env.LACAISSE_PASSWORD);
const caisseId = await resolveCaisseId(auth, {
  login: process.env.LACAISSE_LOGIN,
  password: process.env.LACAISSE_PASSWORD,
  caisseName: 'EPICTETE',
});
console.log('Caisse:', caisseId);

const items = await fetchLineItems(auth, caisseId, { startDate, endDate });
console.log(`Fetched ${items.length} lines`);

const db = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'slowbob',
  password: process.env.DB_PASSWORD || 'slowbob',
  database: process.env.DB_NAME || 'epictete_db',
});
await db.connect();

// Idempotency: clear existing 'lacaisse_dashboard' rows in the import range
const { rowCount: deletedCount } = await db.query(
  `DELETE FROM sales_items WHERE import_source = 'lacaisse_dashboard' AND sale_date BETWEEN $1 AND $2`,
  [startDate, endDate],
);
console.log(`Cleared ${deletedCount} existing rows in range`);

let inserted = 0;
const BATCH = 500;
for (let i = 0; i < items.length; i += BATCH) {
  const slice = items.slice(i, i + BATCH);
  const cols = ['ticket_number', 'family', 'category', 'product_name', 'sub_product',
                'quantity', 'catalog_price', 'selling_price', 'tax_rate', 'profit',
                'dine_in', 'sale_date', 'sale_time', 'import_source', 'lacaisse_order_id'];
  const placeholders = [];
  const values = [];
  let idx = 1;
  for (const it of slice) {
    placeholders.push(`(${cols.map(() => `$${idx++}`).join(', ')})`);
    values.push(
      it.ticket_number, it.family, it.category, it.product_name, it.sub_product,
      it.quantity, it.catalog_price, it.selling_price, it.tax_rate, it.profit,
      it.dine_in, it.sale_date, it.sale_time, 'lacaisse_dashboard', it.lacaisse_order_id,
    );
  }
  const sql = `INSERT INTO sales_items (${cols.join(', ')}) VALUES ${placeholders.join(', ')} ON CONFLICT (ticket_number, product_name, sale_date, sale_time, quantity) DO NOTHING`;
  await db.query(sql, values);
  inserted += slice.length;
}

console.log(`Inserted ${inserted} rows`);

const { rows: agg } = await db.query(
  `SELECT COUNT(*) AS rows, ROUND(SUM(selling_price)::numeric, 2)::text AS revenue,
          MIN(sale_date)::text AS min_date, MAX(sale_date)::text AS max_date
     FROM sales_items WHERE import_source='lacaisse_dashboard'`,
);
console.log('Total in table:', agg[0]);

await db.end();
