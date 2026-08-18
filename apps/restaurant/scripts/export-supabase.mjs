// Export all data from Supabase via Management API
import { writeFileSync } from 'fs';

const PROJECT_REF = 'ertxtpmtyeuzqpxqryix';
const TOKEN = 'sbp_86c64d3cd4fd0ac5ae286c9b68e5a00e515bf314';

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  return res.json();
}

const tables = [
  'roles', 'permissions', 'role_permissions', 'profiles',
  'inventory_categories', 'vendors', 'inventory_items', 'vendor_transactions',
  'inventory_movements', 'purchase_orders', 'purchase_order_items',
  'daily_entries', 'expenses', 'sales_items', 'sales_imports',
  'menu_categories', 'menu_items', 'menus', 'recipes', 'recipe_ingredients',
  'staff_types', 'staff_members', 'staff_schedules', 'staff_time_off',
  'drivers', 'vehicles', 'transport_trips', 'transport_trip_passengers',
  'salle_tables', 'site_content', 'audit_logs', 'invoices',
];

const allData = {};

for (const table of tables) {
  console.log(`Exporting ${table}...`);
  try {
    const data = await query(`SELECT * FROM public.${table};`);
    allData[table] = data;
    console.log(`  → ${Array.isArray(data) ? data.length : 0} rows`);
  } catch (e) {
    console.log(`  → ERROR: ${e.message}`);
    allData[table] = [];
  }
}

writeFileSync('/Users/macbook/Desktop/epictelerestaurant/scripts/data-export/all-data.json', JSON.stringify(allData, null, 2));
console.log('\nExport complete → scripts/data-export/all-data.json');
