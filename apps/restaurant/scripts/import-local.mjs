// Import exported Supabase data into local PostgreSQL
import { readFileSync } from 'fs';
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'localhost',
  user: 'slowbob',
  password: 'slowbob',
  database: 'epictete_db',
});

const allData = JSON.parse(readFileSync('/Users/macbook/Desktop/epictelerestaurant/scripts/data-export/all-data.json', 'utf-8'));

// Import order matters for FK constraints
const importOrder = [
  'roles', 'permissions', 'role_permissions',
  'inventory_categories', 'vendors', 'inventory_items', 'vendor_transactions',
  'inventory_movements', 'purchase_orders', 'purchase_order_items',
  'daily_entries', 'expenses', 'sales_items', 'sales_imports',
  'menu_categories', 'menu_items', 'menus', 'recipes', 'recipe_ingredients',
  'staff_types', 'staff_members', 'staff_schedules', 'staff_time_off',
  'drivers', 'vehicles', 'transport_trips', 'transport_trip_passengers',
  'salle_tables', 'site_content', 'audit_logs', 'invoices',
  // profiles last — needs users to exist
];

function escapeValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  // String
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function main() {
  await client.connect();
  console.log('Connected to local PostgreSQL\n');

  // Disable FK checks for clean import
  await client.query('SET session_replication_role = replica;');

  // Clear all tables
  const allTables = [...importOrder, 'profiles', 'users'];
  for (const table of allTables.reverse()) {
    try {
      await client.query(`TRUNCATE ${table} CASCADE;`);
    } catch (e) {
      // ignore
    }
  }

  for (const table of importOrder) {
    const rows = allData[table];
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      console.log(`${table}: skipped (empty)`);
      continue;
    }

    const cols = Object.keys(rows[0]);
    // Skip generated columns for daily_entries
    const skipCols = table === 'daily_entries'
      ? ['total_revenue', 'total_expenses', 'total_withdrawals', 'solde_theorique']
      : [];
    const useCols = cols.filter(c => !skipCols.includes(c));

    let inserted = 0;
    for (const row of rows) {
      const values = useCols.map(c => escapeValue(row[c]));
      const sql = `INSERT INTO ${table} (${useCols.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;`;
      try {
        await client.query(sql);
        inserted++;
      } catch (e) {
        console.error(`  ${table} error:`, e.message.slice(0, 100));
      }
    }
    console.log(`${table}: ${inserted}/${rows.length} rows`);
  }

  // Now handle profiles — need to create users first from profiles data
  const profiles = allData['profiles'] || [];
  if (profiles.length > 0) {
    console.log(`\nCreating users from ${profiles.length} profiles...`);
    for (const p of profiles) {
      // Create user with default password (slowbob) — they can change later
      try {
        await client.query(
          `INSERT INTO users (id, email, password_hash, created_at) VALUES ($1, $2, crypt('slowbob', gen_salt('bf')), $3) ON CONFLICT (id) DO NOTHING;`,
          [p.id, p.email || `user_${p.id.slice(0,8)}@epictete.ma`, p.created_at || new Date().toISOString()]
        );
      } catch (e) {
        // might conflict with already seeded admin
      }

      // Insert profile
      const profileCols = ['id', 'email', 'full_name', 'avatar_url', 'role_id', 'is_active', 'created_at', 'updated_at'];
      const values = profileCols.map(c => escapeValue(p[c]));
      try {
        await client.query(
          `INSERT INTO profiles (${profileCols.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role_id = EXCLUDED.role_id, is_active = EXCLUDED.is_active;`
        );
      } catch (e) {
        console.error('  profile error:', e.message.slice(0, 100));
      }
    }
    console.log(`profiles: ${profiles.length} imported`);
  }

  // Re-enable FK checks
  await client.query('SET session_replication_role = DEFAULT;');

  console.log('\nImport complete!');
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
