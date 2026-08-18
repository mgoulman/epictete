import { Pool } from "pg";
import { createDb } from "@epictete/core/db";

// Singleton pool + db across hot-reloads / reused instances.
const g = globalThis as unknown as { __saasPool?: Pool };
const pool =
  g.__saasPool ??
  new Pool({
    connectionString: process.env.SAAS_DATABASE_URL,
    max: process.env.SAAS_DATABASE_URL?.includes("neon.tech") ? 1 : 10,
  });
if (process.env.NODE_ENV !== "production") g.__saasPool = pool;
// (Local dev connects as a superuser whose search_path already includes public,
// so no connect-time search_path handler is needed here. Neon prod would add one.)

// Shared tenant-aware compat builder. In dev the login is a superuser, so drop to
// the non-superuser RLS role per tenant txn; in prod connect AS saas_app directly.
export const db = createDb({ pool, rlsRole: process.env.DB_RLS_ROLE || undefined });

export default db;
