import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getServerSession } from '@/lib/auth/supabase-server';
import { approvalRequiredFor, submitApprovalRequest } from '@/lib/approvals';
import type { PermissionName } from '@/lib/types/auth';

// Generic DB query proxy for client-side components.
// Access is enforced per-table against the RBAC resource the table belongs to:
// SELECT needs <resource>.read, writes need <resource>.write (or .delete/.manage
// for the few resources that define them). Admins bypass. Public marketing
// reads (menu, site_content) remain anonymous.

interface Filter {
  column: string;
  op: string;
  value: unknown;
}

interface OrderBy {
  column: string;
  ascending: boolean;
}

// Whitelist of tables that can be queried from the client
const ALLOWED_TABLES = new Set([
  'menu_items', 'menu_categories', 'menus', 'recipes', 'recipe_ingredients',
  'inventory_items', 'inventory_categories', 'vendors', 'vendor_transactions',
  'inventory_movements', 'purchase_orders', 'purchase_order_items',
  'staff_members', 'staff_types', 'staff_schedules', 'staff_time_off',
  'drivers', 'vehicles', 'transport_trips', 'transport_trip_passengers',
  'salle_tables', 'salle_sessions', 'salle_orders',
  'daily_entries', 'expenses', 'sales_items', 'sales_imports',
  'profiles', 'roles', 'permissions', 'role_permissions',
  'site_content', 'audit_logs', 'invoices',
]);

// Tables the public marketing site reads (menu page, home page, etc.)
// Writes still require auth; only SELECT is allowed anonymously.
const PUBLIC_READ_TABLES = new Set(['menu_items', 'menu_categories', 'site_content']);

// Each allowed table maps to the RBAC resource that governs it.
const TABLE_RESOURCE: Record<string, string> = {
  menu_items: 'menu', menu_categories: 'menu', menus: 'menu',
  recipes: 'recipes', recipe_ingredients: 'recipes',
  inventory_items: 'inventory', inventory_categories: 'inventory', inventory_movements: 'inventory',
  purchase_orders: 'inventory', purchase_order_items: 'inventory',
  vendors: 'finance', vendor_transactions: 'finance', invoices: 'finance',
  sales_items: 'finance', sales_imports: 'finance',
  daily_entries: 'reports', expenses: 'reports',
  staff_members: 'personnel', staff_types: 'personnel', staff_schedules: 'personnel', staff_time_off: 'personnel',
  drivers: 'transport', vehicles: 'transport', transport_trips: 'transport', transport_trip_passengers: 'transport',
  salle_tables: 'salle', salle_sessions: 'salle', salle_orders: 'salle',
  site_content: 'marketing',
  profiles: 'users', roles: 'users', permissions: 'users', role_permissions: 'users',
  audit_logs: 'audit',
};

// Required permission for a (resource, action) pair through this proxy.
function requiredPermission(resource: string, action: string): PermissionName | null {
  if (action === 'select') return `${resource}.read` as PermissionName;
  // writes (insert/update/delete)
  if (resource === 'audit') return null;          // audit is read-only here
  if (resource === 'users') return 'users.manage'; // user/role writes are sensitive
  if (resource === 'menu' && action === 'delete') return 'menu.delete';
  return `${resource}.write` as PermissionName;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const body = await request.json();
    const { action, table, select, filters, orders, limit: limitVal, single, data } = body;

    if (!ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ data: null, error: { message: 'Table not allowed' } }, { status: 403 });
    }

    // Authorize per-table/per-action, except anonymous public marketing reads.
    const isPublicRead = action === 'select' && PUBLIC_READ_TABLES.has(table);
    if (!isPublicRead) {
      const session = await getServerSession();
      if (!session) {
        return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 });
      }
      if (session.role !== 'admin') {
        const resource = TABLE_RESOURCE[table];
        const needed = resource ? requiredPermission(resource, action) : null;
        if (!needed || !session.permissions.includes(needed)) {
          return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 });
        }

        // Approval gate: hold configured modules' writes for review.
        if (action !== 'select') {
          const moduleName = TABLE_RESOURCE[table];
          if (moduleName) {
            const rule = await approvalRequiredFor(moduleName, session);
            if (rule) {
              await submitApprovalRequest({
                module: moduleName,
                action: 'db_query',
                payload: { action, table, data, filters },
                summary: `${action} ${table}`,
                session,
                rule,
              });
              return NextResponse.json({ data: null, error: null, pending: true });
            }
          }
        }
      }
    }

    if (action === 'select') {
      let q = supabase.from(table).select(select || '*');
      for (const f of (filters || []) as Filter[]) {
        if (f.op === '=' || f.op === 'eq') q = q.eq(f.column, f.value);
        else if (f.op === '!=' || f.op === 'neq') q = q.neq(f.column, f.value);
        else if (f.op === '>') q = q.gt(f.column, f.value);
        else if (f.op === '>=') q = q.gte(f.column, f.value);
        else if (f.op === '<') q = q.lt(f.column, f.value);
        else if (f.op === '<=') q = q.lte(f.column, f.value);
        else if (f.op === 'ILIKE') q = q.ilike(f.column, f.value as string);
        else if (f.op === 'IN') q = q.in(f.column, f.value as unknown[]);
      }
      for (const o of (orders || []) as OrderBy[]) {
        q = q.order(o.column, { ascending: o.ascending });
      }
      if (limitVal) q = q.limit(limitVal);
      if (single) q = q.single();
      const result = await q;
      return NextResponse.json(result);
    }

    if (action === 'insert') {
      let q = supabase.from(table).insert(data);
      if (select) q = q.select(select);
      if (single) q = q.single();
      const result = await q;
      return NextResponse.json(result);
    }

    if (action === 'update') {
      let q = supabase.from(table).update(data);
      for (const f of (filters || []) as Filter[]) {
        if (f.op === '=' || f.op === 'eq') q = q.eq(f.column, f.value);
      }
      if (single) q = q.single();
      const result = await q;
      return NextResponse.json(result);
    }

    if (action === 'delete') {
      let q = supabase.from(table).delete();
      for (const f of (filters || []) as Filter[]) {
        if (f.op === '=' || f.op === 'eq') q = q.eq(f.column, f.value);
        else if (f.op === 'IN') q = q.in(f.column, f.value as unknown[]);
      }
      const result = await q;
      return NextResponse.json(result);
    }

    return NextResponse.json({ data: null, error: { message: 'Invalid action' } }, { status: 400 });
  } catch (error) {
    console.error('DB query error:', error);
    return NextResponse.json({ data: null, error: { message: 'Query failed' } }, { status: 500 });
  }
}
