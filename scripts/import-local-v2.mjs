// Import v2 — auto-creates missing columns
import { readFileSync } from 'fs';
import pg from 'pg';
const { Client } = pg;

const client = new Client({ host: 'localhost', user: 'slowbob', password: 'slowbob', database: 'epictete_db' });
const allData = JSON.parse(readFileSync('/Users/macbook/Desktop/epictelerestaurant/scripts/data-export/all-data.json', 'utf-8'));

const importOrder = [
  'roles', 'permissions', 'role_permissions',
  'inventory_categories', 'vendors', 'inventory_items', 'vendor_transactions',
  'inventory_movements', 'purchase_orders', 'purchase_order_items',
  'daily_entries', 'expenses', 'sales_items', 'sales_imports',
  'menu_categories', 'menu_items', 'menus', 'recipes', 'recipe_ingredients',
  'staff_types', 'staff_members', 'staff_schedules', 'staff_time_off',
  'drivers', 'vehicles', 'transport_trips', 'transport_trip_passengers',
  'salle_tables', 'site_content', 'audit_logs', 'invoices',
];

const skipCols = { daily_entries: ['total_revenue', 'total_expenses', 'total_withdrawals', 'solde_theorique'] };

function guessType(val) {
  if (val === null || val === undefined) return 'TEXT';
  if (typeof val === 'boolean') return 'BOOLEAN';
  if (typeof val === 'number') return Number.isInteger(val) ? 'INTEGER' : 'NUMERIC';
  if (typeof val === 'object') return 'JSONB';
  if (/^\d{4}-\d{2}-\d{2}T/.test(val)) return 'TIMESTAMPTZ';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return 'DATE';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}/.test(val)) return 'UUID';
  return 'TEXT';
}

function escapeValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  if (Array.isArray(val)) return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function ensureColumns(table, rows) {
  if (!rows.length) return;
  const { rows: existing } = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [table]
  );
  const existingCols = new Set(existing.map(r => r.column_name));
  const sampleRow = rows.find(r => Object.values(r).some(v => v !== null)) || rows[0];

  for (const col of Object.keys(sampleRow)) {
    if (!existingCols.has(col) && !(skipCols[table] || []).includes(col)) {
      const val = rows.find(r => r[col] !== null && r[col] !== undefined)?.[col];
      const pgType = guessType(val);
      try {
        await client.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${col}" ${pgType};`);
        console.log(`  + added column ${table}.${col} (${pgType})`);
      } catch (e) {
        console.error(`  ! column ${table}.${col}: ${e.message.slice(0, 60)}`);
      }
    }
  }
}

async function main() {
  await client.connect();
  console.log('Connected\n');
  await client.query('SET session_replication_role = replica;');

  // Truncate all
  for (const t of [...importOrder, 'profiles', 'users'].reverse()) {
    try { await client.query(`TRUNCATE "${t}" CASCADE;`); } catch {}
  }

  for (const table of importOrder) {
    const rows = allData[table];
    if (!rows?.length) { console.log(`${table}: skipped`); continue; }

    await ensureColumns(table, rows);

    const cols = Object.keys(rows[0]).filter(c => !(skipCols[table] || []).includes(c));
    let ok = 0;
    for (const row of rows) {
      const vals = cols.map(c => escapeValue(row[c]));
      try {
        await client.query(`INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(',')}) VALUES (${vals.join(',')}) ON CONFLICT DO NOTHING;`);
        ok++;
      } catch (e) {
        if (ok === 0) console.error(`  ${table}: ${e.message.slice(0, 80)}`);
      }
    }
    console.log(`${table}: ${ok}/${rows.length}`);
  }

  // Users + Profiles
  const profiles = allData['profiles'] || [];
  for (const p of profiles) {
    await client.query(
      `INSERT INTO users (id, email, password_hash) VALUES ($1, $2, crypt('slowbob', gen_salt('bf'))) ON CONFLICT DO NOTHING;`,
      [p.id, p.email || `user_${p.id.slice(0,8)}@epictete.ma`]
    );
  }
  await ensureColumns('profiles', profiles);
  for (const p of profiles) {
    const cols = Object.keys(p);
    const vals = cols.map(c => escapeValue(p[c]));
    try {
      await client.query(`INSERT INTO profiles (${cols.map(c => `"${c}"`).join(',')}) VALUES (${vals.join(',')}) ON CONFLICT (id) DO UPDATE SET full_name=EXCLUDED.full_name, role_id=EXCLUDED.role_id, is_active=EXCLUDED.is_active;`);
    } catch {}
  }
  console.log(`profiles: ${profiles.length}`);

  await client.query('SET session_replication_role = DEFAULT;');
  console.log('\nDone!');
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
