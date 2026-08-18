import { Pool, type QueryResultRow } from "pg";
import { getTenantContext } from "./tenant-context";

// Identifier guard for the optional RLS role name (never interpolated from user input).
const IDENT = /^[a-z_][a-z0-9_]*$/i;

export interface TenantDbConfig {
  connectionString?: string;
  pool?: Pool;
  /**
   * When set, each tenant-scoped transaction runs `SET LOCAL ROLE <rlsRole>`.
   * Needed in dev, where the login role is a superuser/owner (RLS is bypassed by
   * superusers). In prod you connect AS the non-superuser app role directly and
   * leave this unset.
   */
  rlsRole?: string;
}

/**
 * Tenant-aware Postgres access. Every `query()` runs inside a transaction that
 * sets the transaction-local `app.tenant_id` GUC (validated by Phase-0 Spike 1),
 * so Postgres RLS enforces isolation — no per-call tenant threading, and it fails
 * closed when there is no tenant context.
 */
export class TenantDb {
  private pool: Pool;
  private rlsRole?: string;

  constructor(cfg: TenantDbConfig) {
    if (cfg.rlsRole && !IDENT.test(cfg.rlsRole)) {
      throw new Error(`invalid rlsRole: ${cfg.rlsRole}`);
    }
    this.rlsRole = cfg.rlsRole;
    this.pool = cfg.pool ?? new Pool({ connectionString: cfg.connectionString, max: 1 });
  }

  /** Tenant-scoped query. Throws (fail-closed) if there is no active tenant context. */
  async query<R extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) {
    const ctx = getTenantContext();
    if (!ctx?.tenantId) {
      throw new Error("db.query() called without a tenant context (fail-closed).");
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      // SET LOCAL ROLE + set_config are transaction-local: they reset on COMMIT and
      // never bleed to the next request on the reused pooled connection (Spike 1).
      if (this.rlsRole) await client.query(`SET LOCAL ROLE ${this.rlsRole}`);
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [ctx.tenantId]);
      const res = await client.query<R>(text, params);
      await client.query("COMMIT");
      return res;
    } catch (e) {
      try { await client.query("ROLLBACK"); } catch { /* ignore */ }
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Unscoped query — bypasses tenant context. For provisioning / platform-admin /
   * migrations ONLY. Never expose to tenant-driven code paths.
   */
  async unsafeQuery<R extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) {
    return this.pool.query<R>(text, params);
  }

  async end() {
    await this.pool.end();
  }
}
