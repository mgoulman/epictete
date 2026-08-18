import { Pool, types as pgTypes, type QueryResult } from "pg";
import { getTenantContext } from "./tenant-context";

// Parse DATE (1082) as plain 'YYYY-MM-DD' strings, not JS Date (avoids TZ day-shift).
pgTypes.setTypeParser(1082, (val: string) => val);

// ─── Shared execution context injected into every builder ────────────────────
export type AuditAction = "create" | "update" | "delete";
export type AuditFn = (
  table: string,
  action: AuditAction,
  resourceId: string | null,
  newValues: Record<string, unknown> | null,
) => Promise<void>;

interface DbContext {
  execute: (sql: string, params?: unknown[]) => Promise<QueryResult>;
  audit: AuditFn;
}

type FilterOp = "=" | "!=" | ">" | "<" | ">=" | "<=" | "LIKE" | "ILIKE" | "IN" | "IS";
interface Filter { column: string; op: FilterOp; value: unknown }
interface OrderBy { column: string; ascending: boolean }
export interface QueryBuilderResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  error: { message: string; code?: string } | null;
  count?: number | null;
}

// ─── SELECT builder ──────────────────────────────────────────────────────────
class QueryBuilder<T = Record<string, unknown>> {
  private _table: string;
  private _select = "*";
  private _filters: Filter[] = [];
  private _orders: OrderBy[] = [];
  private _limitVal: number | null = null;
  private _offsetVal: number | null = null;
  private _single = false;
  private _maybeSingle = false;
  private _joins: string[] = [];

  constructor(table: string, private ctx: DbContext) { this._table = table; }

  select(columns = "*", _options?: { count?: string }): this {
    const parts: string[] = [];
    let depth = 0, current = "";
    for (const ch of columns) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      if (ch === "," && depth === 0) { parts.push(current.trim()); current = ""; }
      else current += ch;
    }
    if (current.trim()) parts.push(current.trim());
    const plainCols: string[] = [];
    for (const part of parts) {
      const relationMatch = part.match(/^(\w+):(\w+)(?:!(\w+))?\((.+)\)$/);
      if (relationMatch) {
        const [, alias, relTable, fkHint, relCols] = relationMatch;
        const isSimplePlural = relTable === `${alias}s` || relTable === `${alias}es`;
        const parentSingular = this._table.replace(/s$/, "");
        const isOneToMany = relTable.startsWith(parentSingular + "_") || relTable.startsWith(this._table.replace(/s$/, "") + "_");
        const relColList = relCols.split(",").map(c => c.trim());
        const isSelectAll = relColList.length === 1 && relColList[0] === "*";
        if (isOneToMany) {
          const lastSegment = parentSingular.split("_").pop() as string;
          const sharesPrefix = parentSingular.includes("_") && relTable.startsWith(parentSingular + "_");
          const childFk = sharesPrefix ? `${lastSegment}_id` : `${parentSingular}_id`;
          if (isSelectAll) {
            plainCols.push(`COALESCE((SELECT jsonb_agg(row_to_json(c)) FROM ${relTable} c WHERE c.${childFk} = ${this._table}.id), '[]'::jsonb) AS ${alias}`);
          } else {
            plainCols.push(`COALESCE((SELECT jsonb_agg(jsonb_build_object(${relColList.map(c => `'${c}', c.${c}`).join(", ")})) FROM ${relTable} c WHERE c.${childFk} = ${this._table}.id), '[]'::jsonb) AS ${alias}`);
          }
        } else {
          let fkColumn: string;
          if (fkHint) {
            fkColumn = fkHint.replace(/_fkey$/, "");
            if (fkColumn.startsWith(this._table + "_")) fkColumn = fkColumn.slice(this._table.length + 1);
          } else if (isSimplePlural) {
            fkColumn = `${alias}_id`;
          } else {
            const lastPart = alias.includes("_") ? alias.split("_").pop()! : alias;
            fkColumn = `${lastPart}_id`;
          }
          const subSelect = isSelectAll ? "*" : (relColList.includes("id") ? relColList.join(", ") : ["id", ...relColList].join(", "));
          this._joins.push(`LEFT JOIN LATERAL (SELECT ${subSelect} FROM ${relTable} WHERE id = ${this._table}.${fkColumn} LIMIT 1) r_${alias} ON true`);
          if (isSelectAll) {
            plainCols.push(`row_to_json(r_${alias}) AS ${alias}`);
          } else {
            plainCols.push(`CASE WHEN r_${alias}.id IS NOT NULL THEN jsonb_build_object(${relColList.map(c => `'${c}', r_${alias}.${c}`).join(", ")}) ELSE NULL END AS ${alias}`);
          }
        }
      } else if (part === "*") {
        plainCols.push(`${this._table}.*`);
      } else {
        plainCols.push(part.includes(".") ? part : `${this._table}.${part}`);
      }
    }
    this._select = plainCols.join(", ");
    return this;
  }

  eq(c: string, v: unknown): this { this._filters.push({ column: c, op: "=", value: v }); return this; }
  neq(c: string, v: unknown): this { this._filters.push({ column: c, op: "!=", value: v }); return this; }
  gt(c: string, v: unknown): this { this._filters.push({ column: c, op: ">", value: v }); return this; }
  lt(c: string, v: unknown): this { this._filters.push({ column: c, op: "<", value: v }); return this; }
  gte(c: string, v: unknown): this { this._filters.push({ column: c, op: ">=", value: v }); return this; }
  lte(c: string, v: unknown): this { this._filters.push({ column: c, op: "<=", value: v }); return this; }
  ilike(c: string, p: string): this { this._filters.push({ column: c, op: "ILIKE", value: p }); return this; }
  in(c: string, v: unknown[]): this { this._filters.push({ column: c, op: "IN", value: v }); return this; }
  is(c: string, v: unknown): this { this._filters.push({ column: c, op: "IS", value: v }); return this; }
  filter(c: string, op: string, v: unknown): this { this._filters.push({ column: c, op: op as FilterOp, value: v }); return this; }

  or(conditions: string): this {
    const parts = conditions.split(",").map(c => {
      const m = c.trim().match(/^(\w+)\.(eq|neq|gt|lt|gte|lte|is)\.(.*)/);
      if (!m) return "TRUE";
      const [, col, op, val] = m;
      const sqlOp = op === "eq" ? "=" : op === "neq" ? "!=" : op === "gt" ? ">" : op === "lt" ? "<" : op === "gte" ? ">=" : op === "lte" ? "<=" : "IS";
      const sqlVal = val === "null" ? "NULL" : val === "true" ? "TRUE" : val === "false" ? "FALSE" : `'${val}'`;
      return `${col} ${sqlOp} ${sqlVal}`;
    });
    this._filters.push({ column: `(${parts.join(" OR ")})`, op: "=" as FilterOp, value: "__OR__" });
    return this;
  }

  not(column: string, op: string, value: unknown): this {
    if (op === "is" && value === null) this._filters.push({ column, op: "IS" as FilterOp, value: "NOT NULL" });
    else this._filters.push({ column, op: `NOT ${op}` as FilterOp, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this { this._orders.push({ column, ascending: options?.ascending ?? true }); return this; }
  limit(n: number): this { this._limitVal = n; return this; }
  range(from: number, to: number): this { this._offsetVal = from; this._limitVal = to - from + 1; return this; }
  single(): this { this._single = true; this._limitVal = 1; return this; }
  maybeSingle(): this { this._single = true; this._maybeSingle = true; this._limitVal = 1; return this; }

  async then<TResult = QueryBuilderResult>(
    resolve: (value: QueryBuilderResult) => TResult | PromiseLike<TResult>,
    reject?: (reason: unknown) => TResult | PromiseLike<TResult>,
  ): Promise<TResult> {
    try { return resolve(await this._execute()); }
    catch (err) { if (reject) return reject(err); return resolve({ data: null, error: { message: (err as Error).message } }); }
  }

  private async _execute(): Promise<QueryBuilderResult> {
    const params: unknown[] = [];
    let paramIdx = 1;
    let sql = `SELECT ${this._select} FROM ${this._table}`;
    if (this._joins.length > 0) sql += " " + this._joins.join(" ");
    if (this._filters.length > 0) {
      const conditions = this._filters.map(f => {
        if (f.value === "__OR__") return f.column;
        if (f.op === "IN") { const arr = f.value as unknown[]; const ph = arr.map(() => `$${paramIdx++}`); params.push(...arr); return `${this._table}.${f.column} IN (${ph.join(", ")})`; }
        if (f.op === "IS") return `${this._table}.${f.column} IS ${f.value === null ? "NULL" : "NOT NULL"}`;
        params.push(f.value); return `${this._table}.${f.column} ${f.op} $${paramIdx++}`;
      });
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }
    if (this._orders.length > 0) sql += ` ORDER BY ${this._orders.map(o => `${o.column} ${o.ascending ? "ASC" : "DESC"}`).join(", ")}`;
    if (this._limitVal !== null) { sql += ` LIMIT ${this._limitVal}`; if (this._offsetVal !== null) sql += ` OFFSET ${this._offsetVal}`; }
    const result = await this.ctx.execute(sql, params);
    const rows = result.rows as T[];
    if (this._single) {
      const notFoundError = this._maybeSingle ? null : (rows.length === 0 ? { message: "Not found", code: "PGRST116" } : null);
      return { data: rows[0] || null, error: notFoundError, count: result.rowCount };
    }
    return { data: rows, error: null, count: result.rowCount };
  }
}

// ─── INSERT builder ──────────────────────────────────────────────────────────
class InsertBuilder<T = Record<string, unknown>> {
  private _selectCols = "";
  private _single = false;
  _upsertConflict?: string;
  _upsertIgnore?: boolean;
  constructor(private _table: string, private _data: Record<string, unknown> | Record<string, unknown>[], private ctx: DbContext) {}

  select(cols = "*"): this {
    const parts = cols.split(",").map(s => s.trim());
    const plainCols: string[] = [];
    for (const part of parts) {
      const relationMatch = part.match(/^(\w+):(\w+)\((.+)\)$/);
      if (relationMatch) {
        const [, alias, , relCols] = relationMatch;
        const relColList = relCols.split(",").map(c => c.trim());
        plainCols.push(`(SELECT jsonb_build_object(${relColList.map(c => `'${c}', ${alias}_rel.${c}`).join(", ")}) FROM ${relationMatch[2]} ${alias}_rel WHERE ${alias}_rel.id = inserted.${alias}_id LIMIT 1) AS ${alias}`);
      } else if (part === "*") plainCols.push("inserted.*");
      else plainCols.push(part);
    }
    this._selectCols = plainCols.join(", ");
    return this;
  }
  single(): this { this._single = true; return this; }

  async then<TResult = QueryBuilderResult>(
    resolve: (value: QueryBuilderResult) => TResult | PromiseLike<TResult>,
    reject?: (reason: unknown) => TResult | PromiseLike<TResult>,
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
          if (val !== null && typeof val === "object") allParams.push(JSON.stringify(val));
          else allParams.push(val ?? null);
          return `$${paramIdx++}`;
        });
        valueGroups.push(`(${placeholders.join(", ")})`);
      }
      let conflictClause = "";
      if (this._upsertConflict || this._upsertIgnore) {
        if (this._upsertIgnore) {
          conflictClause = this._upsertConflict ? ` ON CONFLICT (${this._upsertConflict}) DO NOTHING` : " ON CONFLICT DO NOTHING";
        } else if (this._upsertConflict) {
          const conflictCols = new Set(this._upsertConflict.split(",").map(c => c.trim()));
          const updateCols = cols.filter(c => !conflictCols.has(c));
          conflictClause = updateCols.length === 0
            ? ` ON CONFLICT (${this._upsertConflict}) DO NOTHING`
            : ` ON CONFLICT (${this._upsertConflict}) DO UPDATE SET ${updateCols.map(c => `"${c}" = EXCLUDED."${c}"`).join(", ")}`;
        }
      }
      const sql = `INSERT INTO ${this._table} (${cols.map(c => `"${c}"`).join(", ")}) VALUES ${valueGroups.join(", ")}${conflictClause} RETURNING *`;
      const result = await this.ctx.execute(sql, allParams);
      for (const row of result.rows) await this.ctx.audit(this._table, "create", (row.id as string) ?? null, row);
      if (this._selectCols && result.rows.length > 0 && this._selectCols.includes("_rel")) {
        const ids = result.rows.map(r => r.id);
        if (ids.length > 0) {
          const selectResult = await this.ctx.execute(`SELECT ${this._selectCols} FROM ${this._table} inserted WHERE inserted.id = ANY($1)`, [ids]);
          const data = this._single ? selectResult.rows[0] || null : selectResult.rows;
          return resolve({ data: data as T[] | T | null, error: null });
        }
      }
      const data = this._single ? result.rows[0] || null : result.rows;
      return resolve({ data: data as T[] | T | null, error: null });
    } catch (err) { if (reject) return reject(err); return resolve({ data: null, error: { message: (err as Error).message } }); }
  }
}

// ─── UPDATE builder ──────────────────────────────────────────────────────────
class UpdateBuilder<T = Record<string, unknown>> {
  private _filters: Filter[] = [];
  private _single = false;
  constructor(private _table: string, private _data: Record<string, unknown>, private ctx: DbContext) {}
  eq(c: string, v: unknown): this { this._filters.push({ column: c, op: "=", value: v }); return this; }
  select(_cols = "*"): this { return this; }
  single(): this { this._single = true; return this; }
  async then<TResult = QueryBuilderResult>(
    resolve: (value: QueryBuilderResult) => TResult | PromiseLike<TResult>,
    reject?: (reason: unknown) => TResult | PromiseLike<TResult>,
  ): Promise<TResult> {
    try {
      const cols = Object.keys(this._data);
      const params: unknown[] = [];
      let paramIdx = 1;
      const setClauses = cols.map(c => {
        const val = this._data[c];
        if (val !== null && typeof val === "object") params.push(JSON.stringify(val));
        else params.push(val ?? null);
        return `"${c}" = $${paramIdx++}`;
      });
      let sql = `UPDATE ${this._table} SET ${setClauses.join(", ")}`;
      if (this._filters.length > 0) {
        const conditions = this._filters.map(f => { params.push(f.value); return `${f.column} ${f.op} $${paramIdx++}`; });
        sql += ` WHERE ${conditions.join(" AND ")}`;
      }
      sql += " RETURNING *";
      const result = await this.ctx.execute(sql, params);
      for (const row of result.rows) await this.ctx.audit(this._table, "update", (row.id as string) ?? null, this._data);
      const data = this._single ? result.rows[0] || null : result.rows;
      return resolve({ data: data as T[] | T | null, error: null });
    } catch (err) { if (reject) return reject(err); return resolve({ data: null, error: { message: (err as Error).message } }); }
  }
}

// ─── DELETE builder ──────────────────────────────────────────────────────────
class DeleteBuilder<T = Record<string, unknown>> {
  private _filters: Filter[] = [];
  constructor(private _table: string, private ctx: DbContext) {}
  eq(c: string, v: unknown): this { this._filters.push({ column: c, op: "=", value: v }); return this; }
  in(c: string, v: unknown[]): this { this._filters.push({ column: c, op: "IN", value: v }); return this; }
  gte(c: string, v: unknown): this { this._filters.push({ column: c, op: ">=", value: v }); return this; }
  lte(c: string, v: unknown): this { this._filters.push({ column: c, op: "<=", value: v }); return this; }
  neq(c: string, v: unknown): this { this._filters.push({ column: c, op: "!=", value: v }); return this; }
  async then<TResult = QueryBuilderResult>(
    resolve: (value: QueryBuilderResult) => TResult | PromiseLike<TResult>,
    reject?: (reason: unknown) => TResult | PromiseLike<TResult>,
  ): Promise<TResult> {
    try {
      const params: unknown[] = [];
      let paramIdx = 1;
      let sql = `DELETE FROM ${this._table}`;
      if (this._filters.length > 0) {
        const conditions = this._filters.map(f => {
          if (f.op === "IN") { const arr = f.value as unknown[]; const ph = arr.map(() => `$${paramIdx++}`); params.push(...arr); return `${f.column} IN (${ph.join(", ")})`; }
          params.push(f.value); return `${f.column} ${f.op} $${paramIdx++}`;
        });
        sql += ` WHERE ${conditions.join(" AND ")}`;
      }
      sql += " RETURNING *";
      const result = await this.ctx.execute(sql, params);
      for (const row of result.rows) await this.ctx.audit(this._table, "delete", (row.id as string) ?? null, row);
      return resolve({ data: result.rows as T[] | T | null, error: null });
    } catch (err) { if (reject) return reject(err); return resolve({ data: null, error: { message: (err as Error).message } }); }
  }
}

class TableRef<T = Record<string, unknown>> {
  constructor(private _table: string, private ctx: DbContext) {}
  select(columns?: string, options?: { count?: string }): QueryBuilder<T> { return new QueryBuilder<T>(this._table, this.ctx).select(columns, options); }
  insert(data: Record<string, unknown> | Record<string, unknown>[]): InsertBuilder<T> { return new InsertBuilder<T>(this._table, data, this.ctx); }
  update(data: Record<string, unknown>): UpdateBuilder<T> { return new UpdateBuilder<T>(this._table, data, this.ctx); }
  delete(): DeleteBuilder<T> { return new DeleteBuilder<T>(this._table, this.ctx); }
  upsert(data: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string; ignoreDuplicates?: boolean }): InsertBuilder<T> {
    const rows = Array.isArray(data) ? data : [data];
    const b = new InsertBuilder<T>(this._table, rows, this.ctx);
    b._upsertConflict = options?.onConflict || "";
    b._upsertIgnore = options?.ignoreDuplicates ?? false;
    return b;
  }
}

const RLS_ROLE_RE = /^[a-z_][a-z0-9_]*$/i;

export interface CreateDbConfig {
  pool: Pool;
  /** dev: SET LOCAL ROLE to this non-superuser role per tenant txn (prod connects as it directly). */
  rlsRole?: string;
  /** Optional audit hook run after each create/update/delete (app-specific). */
  audit?: AuditFn;
}

export interface CompatDb {
  from<T = Record<string, unknown>>(table: string): TableRef<T>;
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }>;
  /**
   * Platform-level escape hatch: a plain pool.query that NEVER enters the tenant
   * transaction wrapper. Use only for cross-tenant identity/session lookups that
   * establish the very context RLS would need (e.g. resolving which tenant a login
   * belongs to). In dev the superuser login bypasses RLS; in prod this must run as
   * a platform role (or SECURITY DEFINER) able to read the identity tables.
   */
  unsafeQuery<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }>;
  pool: Pool;
}

/**
 * Build a Supabase-compatible, tenant-aware db client over a pg Pool. Every query
 * funnels through `execute`: with an active @epictete/core tenant context it wraps
 * in a transaction that sets the transaction-local `app.tenant_id` GUC so Postgres
 * RLS isolates it; with no context it's a plain pool.query.
 */
export function createDb(config: CreateDbConfig): CompatDb {
  const { pool, rlsRole } = config;
  if (rlsRole && !RLS_ROLE_RE.test(rlsRole)) throw new Error(`invalid rlsRole: ${rlsRole}`);
  const audit: AuditFn = config.audit ?? (async () => {});

  const execute = async (sql: string, params?: unknown[]): Promise<QueryResult> => {
    const tctx = getTenantContext();
    if (!tctx?.tenantId) return pool.query(sql, params);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      if (rlsRole) await client.query(`SET LOCAL ROLE ${rlsRole}`);
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [tctx.tenantId]);
      const res = await client.query(sql, params);
      await client.query("COMMIT");
      return res;
    } catch (e) {
      try { await client.query("ROLLBACK"); } catch { /* ignore */ }
      throw e;
    } finally {
      client.release();
    }
  };

  const ctx: DbContext = { execute, audit };
  return {
    from<T = Record<string, unknown>>(table: string) { return new TableRef<T>(table, ctx); },
    async query<T = Record<string, unknown>>(text: string, params?: unknown[]) {
      const r = await execute(text, params);
      return { rows: r.rows as T[], rowCount: r.rowCount || 0 };
    },
    async unsafeQuery<T = Record<string, unknown>>(text: string, params?: unknown[]) {
      const r = await pool.query(text, params);
      return { rows: r.rows as T[], rowCount: r.rowCount || 0 };
    },
    pool,
  };
}
