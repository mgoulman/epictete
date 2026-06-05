import { Pool, types as pgTypes, type QueryResult } from 'pg';

// Parse DATE (1082) columns as plain strings YYYY-MM-DD instead of JS Date objects
// This avoids timezone shifts that can change the date by one day on the client
pgTypes.setTypeParser(1082, (val: string) => val);

// ─── Connection Pool ────────────────────────────────────────────────────────

// In production (Vercel + Neon) use DATABASE_URL with SSL and a tiny pool
// (one connection per serverless lambda). Locally, fall back to the discrete
// DB_* vars so the developer's local Postgres keeps working.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 30000,
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'slowbob',
      password: process.env.DB_PASSWORD || 'slowbob',
      database: process.env.DB_NAME || 'epictete_db',
      max: 20,
      idleTimeoutMillis: 30000,
    });

// Neon's neondb_owner role has an empty search_path by default, and the pooler
// rejects `options=` startup params — so set it on every new connection.
pool.on('connect', (client) => {
  client.query('SET search_path TO public').catch(() => {});
});

// ─── Audit logging ──────────────────────────────────────────────────────────
// Auto-record every INSERT/UPDATE/DELETE made through the builders into
// audit_logs. Anonymous (no JWT) writes still get logged with a null user_id.
// Never throws — audit failures must not break the caller.

const NON_AUDITABLE_TABLES = new Set(['audit_logs']);

async function recordAudit(
  table: string,
  action: 'create' | 'update' | 'delete',
  resourceId: string | null,
  newValues: Record<string, unknown> | null,
): Promise<void> {
  if (NON_AUDITABLE_TABLES.has(table)) return;

  let userId: string | null = null;
  try {
    const [{ cookies }, { jwtVerify }] = await Promise.all([
      import('next/headers'),
      import('jose'),
    ]);
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (token) {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'epictete-secret-key-change-in-production-2026'
      );
      const { payload } = await jwtVerify(token, secret);
      userId = (payload.sub as string) || null;
    }
  } catch {
    // No request context (cron, script) or invalid token — log as anonymous.
  }

  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, table, resourceId, newValues ? JSON.stringify(newValues) : null]
    );
  } catch (err) {
    console.error('[audit] failed:', (err as Error).message);
  }
}

// ─── Raw query helper ───────────────────────────────────────────────────────

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const result: QueryResult = await pool.query(text, params);
  return { rows: result.rows as T[], rowCount: result.rowCount || 0 };
}

// ─── Supabase-compatible query builder ──────────────────────────────────────
// Mimics: supabase.from('table').select('*').eq('id', x).order('name')
// This keeps API route changes minimal.

type FilterOp = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'ILIKE' | 'IN' | 'IS';

interface Filter {
  column: string;
  op: FilterOp;
  value: unknown;
}

interface OrderBy {
  column: string;
  ascending: boolean;
}

interface QueryBuilderResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  error: { message: string; code?: string } | null;
  count?: number | null;
}

class QueryBuilder<T = Record<string, unknown>> {
  private _table: string;
  private _select: string = '*';
  private _filters: Filter[] = [];
  private _orders: OrderBy[] = [];
  private _limitVal: number | null = null;
  private _single: boolean = false;
  private _maybeSingle: boolean = false;
  private _joins: string[] = [];

  constructor(table: string) {
    this._table = table;
  }

  select(columns: string = '*', _options?: { count?: string }): this {
    // Parse Supabase-style relation selects like:
    // '*, vendor:vendors(id, name), inventory_category:inventory_categories(id, name)'
    // Split by commas but not inside parentheses
    const parts: string[] = [];
    let depth = 0, current = '';
    for (const ch of columns) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) parts.push(current.trim());

    const plainCols: string[] = [];

    for (const part of parts) {
      const relationMatch = part.match(/^(\w+):(\w+)\((.+)\)$/);
      if (relationMatch) {
        const [, alias, relTable, relCols] = relationMatch;
        // Detect relationship type and FK column
        const isSimplePlural = relTable === `${alias}s` || relTable === `${alias}es`;
        const parentSingular = this._table.replace(/s$/, '');
        // One-to-many: child table contains parent name (purchase_order_items for purchase_orders)
        const isOneToMany = relTable.startsWith(parentSingular + '_') || relTable.startsWith(this._table.replace(/s$/, '') + '_');

        const relColList = relCols.split(',').map(c => c.trim());
        const isSelectAll = relColList.length === 1 && relColList[0] === '*';

        if (isOneToMany) {
          // One-to-many: aggregate child rows as JSON array.
          // FK column convention:
          //   - if child table starts with parent_singular (e.g. purchase_orders →
          //     purchase_order_items), the prefix is redundant → FK uses last segment only
          //     (`order_id`, not `purchase_order_id`).
          //   - otherwise (e.g. inventory_items → inventory_movements), use the full
          //     parent_singular (`inventory_item_id`).
          const lastSegment = parentSingular.split('_').pop() as string;
          const sharesPrefix = parentSingular.includes('_') && relTable.startsWith(parentSingular + '_');
          const childFk = sharesPrefix ? `${lastSegment}_id` : `${parentSingular}_id`;
          if (isSelectAll) {
            plainCols.push(
              `COALESCE((SELECT jsonb_agg(row_to_json(c)) FROM ${relTable} c WHERE c.${childFk} = ${this._table}.id), '[]'::jsonb) AS ${alias}`
            );
          } else {
            const colsSelect = relColList.join(', ');
            plainCols.push(
              `COALESCE((SELECT jsonb_agg(jsonb_build_object(${relColList.map(c => `'${c}', c.${c}`).join(', ')})) FROM ${relTable} c WHERE c.${childFk} = ${this._table}.id), '[]'::jsonb) AS ${alias}`
            );
          }
        } else {
          // Many-to-one: FK on this table points to related table.
          let fkColumn: string;
          if (isSimplePlural) {
            fkColumn = `${alias}_id`;
          } else {
            const lastPart = alias.includes('_') ? alias.split('_').pop()! : alias;
            fkColumn = `${lastPart}_id`;
          }

          // Always include id in the subquery select for the IS NOT NULL check
          const subSelect = isSelectAll ? '*' : (relColList.includes('id') ? relColList.join(', ') : ['id', ...relColList].join(', '));
          this._joins.push(
            `LEFT JOIN LATERAL (SELECT ${subSelect} FROM ${relTable} WHERE id = ${this._table}.${fkColumn} LIMIT 1) r_${alias} ON true`
          );
          if (isSelectAll) {
            plainCols.push(`row_to_json(r_${alias}) AS ${alias}`);
          } else {
            plainCols.push(
              `CASE WHEN r_${alias}.id IS NOT NULL THEN jsonb_build_object(${relColList.map(c => `'${c}', r_${alias}.${c}`).join(', ')}) ELSE NULL END AS ${alias}`
            );
          }
        }
      } else if (part === '*') {
        plainCols.push(`${this._table}.*`);
      } else {
        plainCols.push(part.includes('.') ? part : `${this._table}.${part}`);
      }
    }

    this._select = plainCols.join(', ');
    return this;
  }

  eq(column: string, value: unknown): this {
    this._filters.push({ column, op: '=', value });
    return this;
  }

  neq(column: string, value: unknown): this {
    this._filters.push({ column, op: '!=', value });
    return this;
  }

  gt(column: string, value: unknown): this {
    this._filters.push({ column, op: '>', value });
    return this;
  }

  lt(column: string, value: unknown): this {
    this._filters.push({ column, op: '<', value });
    return this;
  }

  gte(column: string, value: unknown): this {
    this._filters.push({ column, op: '>=', value });
    return this;
  }

  lte(column: string, value: unknown): this {
    this._filters.push({ column, op: '<=', value });
    return this;
  }

  ilike(column: string, pattern: string): this {
    this._filters.push({ column, op: 'ILIKE', value: pattern });
    return this;
  }

  in(column: string, values: unknown[]): this {
    this._filters.push({ column, op: 'IN', value: values });
    return this;
  }

  is(column: string, value: unknown): this {
    this._filters.push({ column, op: 'IS', value });
    return this;
  }

  filter(column: string, op: string, value: unknown): this {
    this._filters.push({ column, op: op as FilterOp, value });
    return this;
  }

  or(conditions: string): this {
    // Parse Supabase .or() format: 'col1.eq.val1,col2.eq.val2'
    // Convert to SQL: (col1 = val1 OR col2 = val2)
    const parts = conditions.split(',').map(c => {
      const m = c.trim().match(/^(\w+)\.(eq|neq|gt|lt|gte|lte|is)\.(.*)/);
      if (!m) return 'TRUE';
      const [, col, op, val] = m;
      const sqlOp = op === 'eq' ? '=' : op === 'neq' ? '!=' : op === 'gt' ? '>' : op === 'lt' ? '<' : op === 'gte' ? '>=' : op === 'lte' ? '<=' : 'IS';
      const sqlVal = val === 'null' ? 'NULL' : val === 'true' ? 'TRUE' : val === 'false' ? 'FALSE' : `'${val}'`;
      return `${col} ${sqlOp} ${sqlVal}`;
    });
    this._filters.push({ column: `(${parts.join(' OR ')})`, op: '=' as FilterOp, value: '__OR__' });
    return this;
  }

  not(column: string, op: string, value: unknown): this {
    // .not('col', 'is', null) → col IS NOT NULL
    if (op === 'is' && value === null) {
      this._filters.push({ column, op: 'IS' as FilterOp, value: 'NOT NULL' });
    } else {
      this._filters.push({ column, op: `NOT ${op}` as FilterOp, value });
    }
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this._orders.push({ column, ascending: options?.ascending ?? true });
    return this;
  }

  limit(n: number): this {
    this._limitVal = n;
    return this;
  }

  private _offsetVal: number | null = null;

  range(from: number, to: number): this {
    this._offsetVal = from;
    this._limitVal = to - from + 1;
    return this;
  }

  single(): this {
    this._single = true;
    this._limitVal = 1;
    return this;
  }

  maybeSingle(): this {
    this._single = true;
    this._maybeSingle = true;
    this._limitVal = 1;
    return this;
  }

  // Build and execute
  async then<TResult = QueryBuilderResult>(
    resolve: (value: QueryBuilderResult) => TResult | PromiseLike<TResult>,
    reject?: (reason: unknown) => TResult | PromiseLike<TResult>
  ): Promise<TResult> {
    try {
      const result = await this._execute();
      return resolve(result);
    } catch (err) {
      if (reject) return reject(err);
      return resolve({ data: null, error: { message: (err as Error).message } });
    }
  }

  private async _execute(): Promise<QueryBuilderResult> {
    const params: unknown[] = [];
    let paramIdx = 1;

    let sql = `SELECT ${this._select} FROM ${this._table}`;

    // Joins
    if (this._joins.length > 0) {
      sql += ' ' + this._joins.join(' ');
    }

    // WHERE
    if (this._filters.length > 0) {
      const conditions = this._filters.map(f => {
        // Handle .or() generated condition
        if (f.value === '__OR__') {
          return f.column; // Already formatted as (col1 = val1 OR col2 = val2)
        }
        if (f.op === 'IN') {
          const arr = f.value as unknown[];
          const placeholders = arr.map(() => `$${paramIdx++}`);
          params.push(...arr);
          return `${this._table}.${f.column} IN (${placeholders.join(', ')})`;
        }
        if (f.op === 'IS') {
          return `${this._table}.${f.column} IS ${f.value === null ? 'NULL' : 'NOT NULL'}`;
        }
        params.push(f.value);
        return `${this._table}.${f.column} ${f.op} $${paramIdx++}`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // ORDER BY
    if (this._orders.length > 0) {
      sql += ` ORDER BY ${this._orders.map(o => `${o.column} ${o.ascending ? 'ASC' : 'DESC'}`).join(', ')}`;
    }

    // LIMIT
    if (this._limitVal !== null) {
      sql += ` LIMIT ${this._limitVal}`;
      if (this._offsetVal !== null) sql += ` OFFSET ${this._offsetVal}`;
    }

    const result = await pool.query(sql, params);
    const rows = result.rows as T[];

    if (this._single) {
      const notFoundError = this._maybeSingle ? null : (rows.length === 0 ? { message: 'Not found', code: 'PGRST116' } : null);
      return { data: rows[0] || null, error: notFoundError, count: result.rowCount };
    }

    return { data: rows, error: null, count: result.rowCount };
  }
}

// ─── Insert builder ─────────────────────────────────────────────────────────

class InsertBuilder<T = Record<string, unknown>> {
  private _table: string;
  private _data: Record<string, unknown> | Record<string, unknown>[];
  private _selectCols: string = '';
  private _single: boolean = false;
  private _joins: string[] = [];

  constructor(table: string, data: Record<string, unknown> | Record<string, unknown>[]) {
    this._table = table;
    this._data = data;
  }

  select(cols: string = '*'): this {
    // Re-use the same relation parsing for returning data
    const parts = cols.split(',').map(s => s.trim());
    const plainCols: string[] = [];
    for (const part of parts) {
      const relationMatch = part.match(/^(\w+):(\w+)\((.+)\)$/);
      if (relationMatch) {
        const [, alias, , relCols] = relationMatch;
        const relColList = relCols.split(',').map(c => c.trim());
        plainCols.push(
          `(SELECT jsonb_build_object(${relColList.map(c => `'${c}', ${alias}_rel.${c}`).join(', ')}) FROM ${relationMatch[2]} ${alias}_rel WHERE ${alias}_rel.id = inserted.${alias}_id LIMIT 1) AS ${alias}`
        );
      } else if (part === '*') {
        plainCols.push('inserted.*');
      } else {
        plainCols.push(part);
      }
    }
    this._selectCols = plainCols.join(', ');
    return this;
  }

  single(): this {
    this._single = true;
    return this;
  }

  async then<TResult = QueryBuilderResult>(
    resolve: (value: QueryBuilderResult) => TResult | PromiseLike<TResult>,
    reject?: (reason: unknown) => TResult | PromiseLike<TResult>
  ): Promise<TResult> {
    try {
      const rows = Array.isArray(this._data) ? this._data : [this._data];
      if (rows.length === 0) return resolve({ data: null, error: null });

      const cols = Object.keys(rows[0]);
      const allParams: unknown[] = [];
      const valueGroups: string[] = [];

      let paramIdx = 1;
      for (const row of rows) {
        const placeholders = cols.map(c => {
          const val = row[c];
          // Stringify both objects and arrays — the schema has no native
          // Postgres array columns, so any array value targets a JSONB column
          // and node-pg needs a JSON string, not a JS array.
          if (val !== null && typeof val === 'object') {
            allParams.push(JSON.stringify(val));
          } else {
            allParams.push(val ?? null);
          }
          return `$${paramIdx++}`;
        });
        valueGroups.push(`(${placeholders.join(', ')})`);
      }

      const returning = this._selectCols
        ? `RETURNING *`
        : 'RETURNING *';

      // Handle upsert options. Supabase semantics:
      //   upsert(data, { onConflict: 'col' })                        → DO UPDATE (insert or update)
      //   upsert(data, { onConflict: 'col', ignoreDuplicates: true }) → DO NOTHING (insert or skip)
      //   upsert(data, { ignoreDuplicates: true })                   → DO NOTHING on any conflict
      const upsertConflict = (this as unknown as Record<string, unknown>)._upsertConflict as string | undefined;
      const upsertIgnore = (this as unknown as Record<string, unknown>)._upsertIgnore as boolean | undefined;
      let conflictClause = '';
      if (upsertConflict || upsertIgnore) {
        if (upsertIgnore) {
          conflictClause = upsertConflict
            ? ` ON CONFLICT (${upsertConflict}) DO NOTHING`
            : ' ON CONFLICT DO NOTHING';
        } else if (upsertConflict) {
          // Update every column we're inserting (except the conflict key itself)
          // using EXCLUDED — Postgres' standard insert-or-update pattern.
          const conflictCols = new Set(upsertConflict.split(',').map(c => c.trim()));
          const updateCols = cols.filter(c => !conflictCols.has(c));
          if (updateCols.length === 0) {
            conflictClause = ` ON CONFLICT (${upsertConflict}) DO NOTHING`;
          } else {
            const setClauses = updateCols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');
            conflictClause = ` ON CONFLICT (${upsertConflict}) DO UPDATE SET ${setClauses}`;
          }
        }
      }

      const sql = `INSERT INTO ${this._table} (${cols.map(c => `"${c}"`).join(', ')}) VALUES ${valueGroups.join(', ')}${conflictClause} ${returning}`;
      const result = await pool.query(sql, allParams);

      for (const row of result.rows) {
        await recordAudit(this._table, 'create', (row.id as string) ?? null, row);
      }

      if (this._selectCols && result.rows.length > 0) {
        // If complex select with relations, do a follow-up query
        const ids = result.rows.map(r => r.id);
        if (ids.length > 0 && this._selectCols.includes('_rel')) {
          const selectSql = `SELECT ${this._selectCols} FROM ${this._table} inserted WHERE inserted.id = ANY($1)`;
          const selectResult = await pool.query(selectSql, [ids]);
          const data = this._single ? selectResult.rows[0] || null : selectResult.rows;
          return resolve({ data: data as T[] | T | null, error: null });
        }
      }

      const data = this._single ? result.rows[0] || null : result.rows;
      return resolve({ data: data as T[] | T | null, error: null });
    } catch (err) {
      if (reject) return reject(err);
      return resolve({ data: null, error: { message: (err as Error).message } });
    }
  }
}

// ─── Update builder ─────────────────────────────────────────────────────────

class UpdateBuilder<T = Record<string, unknown>> {
  private _table: string;
  private _data: Record<string, unknown>;
  private _filters: Filter[] = [];
  private _selectCols: string = '';
  private _single: boolean = false;

  constructor(table: string, data: Record<string, unknown>) {
    this._table = table;
    this._data = data;
  }

  eq(column: string, value: unknown): this {
    this._filters.push({ column, op: '=', value });
    return this;
  }

  select(cols: string = '*'): this {
    this._selectCols = cols;
    return this;
  }

  single(): this {
    this._single = true;
    return this;
  }

  async then<TResult = QueryBuilderResult>(
    resolve: (value: QueryBuilderResult) => TResult | PromiseLike<TResult>,
    reject?: (reason: unknown) => TResult | PromiseLike<TResult>
  ): Promise<TResult> {
    try {
      const cols = Object.keys(this._data);
      const params: unknown[] = [];
      let paramIdx = 1;

      const setClauses = cols.map(c => {
        const val = this._data[c];
        if (val !== null && typeof val === 'object') {
          params.push(JSON.stringify(val));
        } else {
          params.push(val ?? null);
        }
        return `"${c}" = $${paramIdx++}`;
      });

      let sql = `UPDATE ${this._table} SET ${setClauses.join(', ')}`;

      if (this._filters.length > 0) {
        const conditions = this._filters.map(f => {
          params.push(f.value);
          return `${f.column} ${f.op} $${paramIdx++}`;
        });
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      sql += ' RETURNING *';
      const result = await pool.query(sql, params);

      for (const row of result.rows) {
        await recordAudit(this._table, 'update', (row.id as string) ?? null, this._data);
      }

      const data = this._single ? result.rows[0] || null : result.rows;
      return resolve({ data: data as T[] | T | null, error: null });
    } catch (err) {
      if (reject) return reject(err);
      return resolve({ data: null, error: { message: (err as Error).message } });
    }
  }
}

// ─── Delete builder ─────────────────────────────────────────────────────────

class DeleteBuilder<T = Record<string, unknown>> {
  private _table: string;
  private _filters: Filter[] = [];

  constructor(table: string) {
    this._table = table;
  }

  eq(column: string, value: unknown): this {
    this._filters.push({ column, op: '=', value });
    return this;
  }

  in(column: string, values: unknown[]): this {
    this._filters.push({ column, op: 'IN', value: values });
    return this;
  }

  gte(column: string, value: unknown): this {
    this._filters.push({ column, op: '>=', value });
    return this;
  }

  lte(column: string, value: unknown): this {
    this._filters.push({ column, op: '<=', value });
    return this;
  }

  neq(column: string, value: unknown): this {
    this._filters.push({ column, op: '!=', value });
    return this;
  }

  async then<TResult = QueryBuilderResult>(
    resolve: (value: QueryBuilderResult) => TResult | PromiseLike<TResult>,
    reject?: (reason: unknown) => TResult | PromiseLike<TResult>
  ): Promise<TResult> {
    try {
      const params: unknown[] = [];
      let paramIdx = 1;

      let sql = `DELETE FROM ${this._table}`;

      if (this._filters.length > 0) {
        const conditions = this._filters.map(f => {
          if (f.op === 'IN') {
            const arr = f.value as unknown[];
            const placeholders = arr.map(() => `$${paramIdx++}`);
            params.push(...arr);
            return `${f.column} IN (${placeholders.join(', ')})`;
          }
          params.push(f.value);
          return `${f.column} ${f.op} $${paramIdx++}`;
        });
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      sql += ' RETURNING *';
      const result = await pool.query(sql, params);

      for (const row of result.rows) {
        await recordAudit(this._table, 'delete', (row.id as string) ?? null, row);
      }

      return resolve({ data: result.rows as T[] | T | null, error: null });
    } catch (err) {
      if (reject) return reject(err);
      return resolve({ data: null, error: { message: (err as Error).message } });
    }
  }
}

// ─── Table entry point ──────────────────────────────────────────────────────

class TableRef<T = Record<string, unknown>> {
  private _table: string;

  constructor(table: string) {
    this._table = table;
  }

  select(columns?: string, options?: { count?: string }): QueryBuilder<T> {
    return new QueryBuilder<T>(this._table).select(columns, options);
  }

  insert(data: Record<string, unknown> | Record<string, unknown>[]): InsertBuilder<T> {
    return new InsertBuilder<T>(this._table, data);
  }

  update(data: Record<string, unknown>): UpdateBuilder<T> {
    return new UpdateBuilder<T>(this._table, data);
  }

  delete(): DeleteBuilder<T> {
    return new DeleteBuilder<T>(this._table);
  }

  upsert(data: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string; ignoreDuplicates?: boolean }): InsertBuilder<T> {
    // For upsert with ignoreDuplicates, we use INSERT ... ON CONFLICT DO NOTHING
    // This is a simplified implementation that handles the most common case
    const rows = Array.isArray(data) ? data : [data];
    const builder = new InsertBuilder<T>(this._table, rows);
    // Store upsert options on the builder (we'll handle via ON CONFLICT in SQL)
    (builder as unknown as Record<string, unknown>)._upsertConflict = options?.onConflict || '';
    (builder as unknown as Record<string, unknown>)._upsertIgnore = options?.ignoreDuplicates ?? false;
    return builder;
  }
}

// ─── Database client (Supabase-compatible interface) ────────────────────────

export const db = {
  from<T = Record<string, unknown>>(table: string): TableRef<T> {
    return new TableRef<T>(table);
  },
  query,
  pool,
};

export default db;
