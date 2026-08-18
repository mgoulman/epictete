// Verifies tenant-context plumbing end-to-end THROUGH the db layer (not raw SQL):
// runWithTenant() + TenantDb.query() must isolate via RLS on epictete_saas_dev.
// Run: DB_PASSWORD=… tsx packages/core/test/isolation.ts
import { TenantDb, runWithTenant } from "../src/db";

const cs = `postgres://${process.env.DB_USER ?? "slowbob"}:${encodeURIComponent(process.env.DB_PASSWORD ?? "")}@${process.env.DB_HOST ?? "localhost"}:${process.env.DB_PORT ?? "5432"}/epictete_saas_dev`;
// dev login (slowbob) is a superuser -> drop to saas_app per txn so RLS applies.
const db = new TenantDb({ connectionString: cs, rlsRole: "saas_app" });

let pass = true;
const check = (n: string, c: boolean) => { console.log(`  ${c ? "✅" : "❌"} ${n}`); if (!c) pass = false; };

try {
  const tenants = (await db.unsafeQuery<{ id: string; slug: string }>("select id, slug from tenants order by slug")).rows;
  if (tenants.length < 2) throw new Error("need >=2 tenants seeded (run the earlier tenancy test first)");
  const [t1, t2] = tenants;
  console.log(`tenants: ${t1.slug}=${t1.id.slice(0, 8)} , ${t2.slug}=${t2.id.slice(0, 8)}\n`);

  console.log("-- through TenantDb.query() + runWithTenant() --");
  await runWithTenant({ tenantId: t1.id }, async () => {
    const rows = (await db.query<{ slug: string }>("select slug from tenants")).rows;
    check("T1 ctx: tenants -> only T1", rows.length === 1 && rows[0].slug === t1.slug);
    check("T1 ctx: branches -> only T1's", (await db.query<{ n: number }>("select count(*)::int n from branches")).rows[0].n >= 1
      && (await db.query<{ tenant_id: string }>("select tenant_id from branches")).rows.every(r => r.tenant_id === t1.id));
    check("T1 ctx: memberships -> only T1's", (await db.query<{ tenant_id: string }>("select tenant_id from memberships")).rows.every(r => r.tenant_id === t1.id));
  });

  await runWithTenant({ tenantId: t2.id }, async () => {
    check("T2 ctx: tenants -> only T2", (await db.query<{ slug: string }>("select slug from tenants")).rows.every(r => r.slug === t2.slug));
  });

  // fail-closed: no runWithTenant scope -> query throws
  let threw = false;
  try { await db.query("select 1"); } catch { threw = true; }
  check("no context: db.query() throws (fail-closed)", threw);

  // WITH CHECK through the layer: T1 cannot insert a branch for T2
  let blocked = false;
  await runWithTenant({ tenantId: t1.id }, async () => {
    try { await db.query("insert into branches(tenant_id,name) values($1,'forged')", [t2.id]); }
    catch { blocked = true; }
  });
  check("T1 ctx: cannot insert branch for T2 (WITH CHECK)", blocked);

  console.log(`\n${pass ? "✅ TENANT-CONTEXT PLUMBING: RLS isolation holds through the db layer (ALS + SET LOCAL)." : "❌ FAILED"}`);
} catch (e) {
  console.error("error:", (e as Error).message); pass = false;
} finally {
  await db.end();
  process.exit(pass ? 0 : 1);
}
