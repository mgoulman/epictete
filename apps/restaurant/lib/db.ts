import { Pool } from 'pg';
import { createDb, type AuditAction } from '@epictete/core/db';

// ─── Connection Pool ────────────────────────────────────────────────────────
// Production (Vercel + Neon) uses DATABASE_URL with SSL + a tiny pool; locally
// fall back to discrete DB_* vars so the developer's local Postgres keeps working.
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1, idleTimeoutMillis: 30000 })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'slowbob',
      password: process.env.DB_PASSWORD || 'slowbob',
      database: process.env.DB_NAME || 'epictete_db',
      max: 20,
      idleTimeoutMillis: 30000,
    });

// Neon's neondb_owner role has an empty search_path by default and the pooler
// rejects `options=` startup params — so set it on every new connection.
pool.on('connect', (client) => {
  client.query('SET search_path TO public').catch(() => {});
});

// ─── Audit logging ──────────────────────────────────────────────────────────
// Auto-record every INSERT/UPDATE/DELETE made through the builders into audit_logs.
// Anonymous (no JWT) writes still get logged with a null user_id. Never throws.
const NON_AUDITABLE_TABLES = new Set(['audit_logs']);

async function recordAudit(
  table: string,
  action: AuditAction,
  resourceId: string | null,
  newValues: Record<string, unknown> | null,
): Promise<void> {
  if (NON_AUDITABLE_TABLES.has(table)) return;
  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    const [{ cookies }, { jwtVerify }] = await Promise.all([import('next/headers'), import('jose')]);
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (token && process.env.JWT_SECRET) {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      userId = (payload.sub as string) || null;
      if (userId) {
        try {
          const { rows } = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
          userEmail = (rows[0]?.email as string) || null;
        } catch { /* ignore — id still useful */ }
      }
    }
  } catch { /* no request context (cron/script) or invalid token — log anonymous */ }
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, new_values)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, userEmail, action, table, resourceId, newValues ? JSON.stringify(newValues) : null],
    );
  } catch (err) {
    console.error('[audit] failed:', (err as Error).message);
  }
}

// The single-tenant restaurant sets no tenant context, so the shared, tenant-aware
// builder runs as plain pool.query — identical to before. (rlsRole is only honored
// when a tenant context is active, which never happens in this app.)
const db = createDb({ pool, rlsRole: process.env.DB_RLS_ROLE, audit: recordAudit });

export const query = db.query;
export { db };
export default db;
