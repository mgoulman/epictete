// Client-side database access via API proxy
// Replaces Supabase browser client — provides same .from().select().eq() interface
// but routes through /api/ endpoints that use the server-side db

type FilterOp = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'ILIKE' | 'IN' | 'IS';

interface Filter { column: string; op: FilterOp; value: unknown; }
interface OrderBy { column: string; ascending: boolean; }

interface QueryResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  error: { message: string } | null;
}

// ─── Client-side query builder that calls a generic API ─────────────────────

class ClientQueryBuilder<T = Record<string, unknown>> {
  private _table: string;
  private _select: string = '*';
  private _filters: Filter[] = [];
  private _orders: OrderBy[] = [];
  private _limitVal: number | null = null;
  private _single = false;

  constructor(table: string) { this._table = table; }

  select(columns?: string) { if (columns) this._select = columns; return this; }
  eq(column: string, value: unknown) { this._filters.push({ column, op: '=', value }); return this; }
  neq(column: string, value: unknown) { this._filters.push({ column, op: '!=', value }); return this; }
  gt(column: string, value: unknown) { this._filters.push({ column, op: '>', value }); return this; }
  gte(column: string, value: unknown) { this._filters.push({ column, op: '>=', value }); return this; }
  lt(column: string, value: unknown) { this._filters.push({ column, op: '<', value }); return this; }
  lte(column: string, value: unknown) { this._filters.push({ column, op: '<=', value }); return this; }
  ilike(column: string, pattern: string) { this._filters.push({ column, op: 'ILIKE', value: pattern }); return this; }
  in(column: string, values: unknown[]) { this._filters.push({ column, op: 'IN', value: values }); return this; }
  is(column: string, value: unknown) { this._filters.push({ column, op: 'IS', value }); return this; }
  filter(column: string, op: string, value: unknown) { this._filters.push({ column, op: op as FilterOp, value }); return this; }
  order(column: string, options?: { ascending?: boolean }) { this._orders.push({ column, ascending: options?.ascending ?? true }); return this; }
  limit(n: number) { this._limitVal = n; return this; }
  single() { this._single = true; return this; }

  async then<TResult>(
    resolve: (value: QueryResult) => TResult | PromiseLike<TResult>,
    reject?: (reason: unknown) => TResult | PromiseLike<TResult>
  ): Promise<TResult> {
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'select',
          table: this._table,
          select: this._select,
          filters: this._filters,
          orders: this._orders,
          limit: this._limitVal,
          single: this._single,
        }),
      });
      const data = await res.json();
      return resolve(data as QueryResult);
    } catch (err) {
      const result = { data: null, error: { message: (err as Error).message } };
      if (reject) return reject(result);
      return resolve(result as QueryResult);
    }
  }
}

class ClientInsertBuilder<T = Record<string, unknown>> {
  private _table: string;
  private _data: Record<string, unknown> | Record<string, unknown>[];
  private _selectCols = '*';
  private _single = false;

  constructor(table: string, data: Record<string, unknown> | Record<string, unknown>[]) {
    this._table = table;
    this._data = data;
  }

  select(cols?: string) { if (cols) this._selectCols = cols; return this; }
  single() { this._single = true; return this; }

  async then<TResult>(
    resolve: (value: QueryResult) => TResult | PromiseLike<TResult>,
  ): Promise<TResult> {
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'insert', table: this._table, data: this._data, select: this._selectCols, single: this._single }),
      });
      return resolve(await res.json());
    } catch (err) {
      return resolve({ data: null, error: { message: (err as Error).message } } as QueryResult);
    }
  }
}

class ClientUpdateBuilder<T = Record<string, unknown>> {
  private _table: string;
  private _data: Record<string, unknown>;
  private _filters: Filter[] = [];
  private _single = false;

  constructor(table: string, data: Record<string, unknown>) { this._table = table; this._data = data; }
  eq(column: string, value: unknown) { this._filters.push({ column, op: '=', value }); return this; }
  select() { return this; }
  single() { this._single = true; return this; }

  async then<TResult>(resolve: (value: QueryResult) => TResult | PromiseLike<TResult>): Promise<TResult> {
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', table: this._table, data: this._data, filters: this._filters, single: this._single }),
      });
      return resolve(await res.json());
    } catch (err) {
      return resolve({ data: null, error: { message: (err as Error).message } } as QueryResult);
    }
  }
}

class ClientDeleteBuilder<T = Record<string, unknown>> {
  private _table: string;
  private _filters: Filter[] = [];

  constructor(table: string) { this._table = table; }
  eq(column: string, value: unknown) { this._filters.push({ column, op: '=', value }); return this; }
  in(column: string, values: unknown[]) { this._filters.push({ column, op: 'IN', value: values }); return this; }

  async then<TResult>(resolve: (value: QueryResult) => TResult | PromiseLike<TResult>): Promise<TResult> {
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', table: this._table, filters: this._filters }),
      });
      return resolve(await res.json());
    } catch (err) {
      return resolve({ data: null, error: { message: (err as Error).message } } as QueryResult);
    }
  }
}

class ClientTableRef<T = Record<string, unknown>> {
  private _table: string;
  constructor(table: string) { this._table = table; }
  select(columns?: string) { return new ClientQueryBuilder<T>(this._table).select(columns); }
  insert(data: Record<string, unknown> | Record<string, unknown>[]) { return new ClientInsertBuilder<T>(this._table, data); }
  update(data: Record<string, unknown>) { return new ClientUpdateBuilder<T>(this._table, data); }
  delete() { return new ClientDeleteBuilder<T>(this._table); }
}

// ─── Browser client (singleton) ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const noopChannel: any = {
  on(..._args: any[]) { return noopChannel; },
  subscribe(..._args: any[]) { return noopChannel; },
  unsubscribe() {},
};

const browserClient = {
  from<T = Record<string, unknown>>(table: string) {
    return new ClientTableRef<T>(table);
  },
  channel(_name?: string) { return noopChannel; },
  removeChannel(_ch?: unknown) {},
  storage: {
    from(_bucket?: string) {
      return {
        upload: async (..._args: unknown[]) => ({ data: null, error: { message: 'Storage not available locally' } }),
        getPublicUrl: (..._args: unknown[]) => ({ data: { publicUrl: '' } }),
        remove: async () => ({ data: null, error: null }),
        list: async () => ({ data: [], error: null }),
      };
    },
  },
  auth: {
    async getUser() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        return { data: { user: data.user }, error: data.user ? null : { message: 'Not authenticated' } };
      } catch {
        return { data: { user: null }, error: { message: 'Failed to fetch user' } };
      }
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.error) return { data: { user: null }, error: { message: data.error } };
      return { data: { user: data.user }, error: null };
    },
    async signOut() {
      await fetch('/api/auth/logout', { method: 'POST' });
    },
    onAuthStateChange() {
      // No-op for local auth — no real-time subscription needed
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  },
};

export function createSupabaseBrowserClient() {
  return browserClient;
}
