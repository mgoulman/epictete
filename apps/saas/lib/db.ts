import { TenantDb } from "@epictete/core/db";

// Singleton across hot-reloads / reused lambda instances.
const globalForDb = globalThis as unknown as { __saasDb?: TenantDb };

export const db =
  globalForDb.__saasDb ??
  new TenantDb({
    connectionString: process.env.SAAS_DATABASE_URL,
    // Dev: login role is a superuser -> drop to the non-superuser RLS role per txn.
    // Prod: connect AS the non-superuser app role and leave this unset.
    rlsRole: process.env.DB_RLS_ROLE || undefined,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__saasDb = db;
