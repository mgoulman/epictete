import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, PackageX, Users, Truck, ArrowRight } from "lucide-react";
import { runWithTenant } from "@epictete/core/db";
import { db } from "@/lib/db";
import { resolveTenant } from "@/lib/tenant";
import { getSessionView } from "@/lib/session";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Sparkline } from "@/components/ui/Sparkline";
import { money, dateFR, todayISO } from "@/lib/format";
import { FirstRun } from "./FirstRun";

export const dynamic = "force-dynamic";

interface DashData {
  cashCount: number;
  latest: { entry_date: string; total_ca: number; total_especes_caisse: number; total_depense: number } | null;
  lowStock: number;
  staffTotal: number;
  presentToday: number;
  vendorDue: number;
  trend: number[];
}

async function load(tenantId: string, userId?: string, role?: string): Promise<DashData> {
  return runWithTenant({ tenantId, userId, role }, async () => {
    const today = todayISO();
    const n = async (sql: string, params?: unknown[]) => {
      try {
        return (await db.query<{ n: number }>(sql, params)).rows[0]?.n ?? 0;
      } catch {
        return 0;
      }
    };

    const cashCount = await n("SELECT count(*)::int n FROM cash_sheets");
    let latest: DashData["latest"] = null;
    try {
      latest =
        (
          await db.query<DashData["latest"] & object>(
            `SELECT entry_date, total_ca, total_especes_caisse, total_depense
               FROM cash_sheets ORDER BY entry_date DESC LIMIT 1`,
          )
        ).rows[0] ?? null;
    } catch {
      /* ignore */
    }
    const lowStock = await n(
      "SELECT count(*)::int n FROM inventory_items WHERE minimum_stock > 0 AND quantity <= minimum_stock",
    );
    const staffTotal = await n("SELECT count(*)::int n FROM staff_members WHERE is_active = true");
    const presentToday = await n(
      "SELECT count(*)::int n FROM attendance WHERE date = $1 AND status = 'present'",
      [today],
    );
    let vendorDue = 0;
    try {
      vendorDue = Number(
        (
          await db.query<{ bal: number }>(
            `SELECT COALESCE(SUM(CASE
                WHEN type IN ('purchase','invoice','debt','achat','facture') THEN amount
                WHEN type IN ('payment','paiement','reglement','règlement') THEN -amount
                ELSE 0 END), 0)::numeric bal
              FROM vendor_transactions`,
          )
        ).rows[0]?.bal ?? 0,
      );
    } catch {
      /* ignore */
    }
    let trend: number[] = [];
    try {
      const rows = (
        await db.query<{ total_ca: number }>(
          "SELECT total_ca FROM cash_sheets ORDER BY entry_date DESC LIMIT 7",
        )
      ).rows;
      trend = rows.map((r) => Number(r.total_ca)).reverse();
    } catch {
      /* ignore */
    }
    return { cashCount, latest, lowStock, staffTotal, presentToday, vendorDue, trend };
  });
}

export default async function DashboardPage() {
  const [session, ctx] = await Promise.all([getSessionView(), resolveTenant()]);
  if (!session || !ctx) redirect("/login");
  const data = await load(ctx.tenantId, ctx.userId, ctx.role);

  const firstName = session.user.name.split(/\s+/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">
          {greeting}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)] capitalize">
          {session.tenant.name} · {dateFR(new Date())}
        </p>
      </div>

      {data.cashCount === 0 ? (
        <FirstRun />
      ) : (
        <>
          {/* Hero KPI row — cash first & largest */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              featured
              label="Caisse du jour"
              value={money(data.latest?.total_ca)}
              icon={<Wallet className="h-5 w-5" />}
              tone="accent"
              href="/caisse"
              hint={
                data.latest
                  ? `Espèces en caisse ${money(data.latest.total_especes_caisse)} · ${dateFR(data.latest.entry_date)}`
                  : "Aucune feuille enregistrée"
              }
            />
            <StatCard
              label="Stock bas"
              value={data.lowStock}
              icon={<PackageX className="h-5 w-5" />}
              tone={data.lowStock > 0 ? "warning" : "positive"}
              href="/stock"
              hint={data.lowStock > 0 ? "produits à réapprovisionner" : "tout est au-dessus du seuil"}
            />
            <StatCard
              label="Présence"
              value={`${data.presentToday} / ${data.staffTotal}`}
              icon={<Users className="h-5 w-5" />}
              tone="info"
              href="/equipe/presence"
              hint="présents aujourd’hui"
            />
          </div>

          {/* Secondary row */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <StatCard
              label="Dû aux fournisseurs"
              value={money(data.vendorDue)}
              icon={<Truck className="h-5 w-5" />}
              tone={data.vendorDue > 0 ? "danger" : "positive"}
              href="/fournisseurs"
              hint={data.vendorDue > 0 ? "solde à régler" : "à jour"}
            />
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Tendance de la caisse · 7 jours</CardTitle>
                <Link href="/rapports" className="text-xs font-medium text-[var(--color-accent)] hover:underline">
                  Voir les rapports
                </Link>
              </CardHeader>
              <CardBody>
                <Sparkline data={data.trend} />
              </CardBody>
            </Card>
          </div>

          {/* Daily loop CTA */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius)] border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/[0.06] px-5 py-4">
            <div>
              <div className="font-semibold text-[var(--color-foreground)]">Fermer la caisse du jour</div>
              <div className="text-sm text-[var(--color-muted-foreground)]">
                Enregistrez la feuille de caisse d’aujourd’hui pour garder le contrôle.
              </div>
            </div>
            <Link href="/caisse">
              <Button size="lg">
                Ouvrir la Feuille de Caisse <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
