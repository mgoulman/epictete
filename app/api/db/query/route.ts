import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';

// Generic DB query proxy for client-side components
// Only authenticated users can use this endpoint

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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Verify auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ data: null, error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const body = await request.json();
    const { action, table, select, filters, orders, limit: limitVal, single, data } = body;

    if (!ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ data: null, error: { message: 'Table not allowed' } }, { status: 403 });
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
