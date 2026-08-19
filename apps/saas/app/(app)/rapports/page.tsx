import { redirect } from "next/navigation";
import { LineChart } from "lucide-react";
import { runWithTenant } from "@epictete/core/db";
import { db } from "@/lib/db";
import { resolveTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { money, money2, dateFR } from "@/lib/format";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/labels";

export const dynamic = "force-dynamic";

interface Sheet { entry_date: string; total_ca: number; total_depense: number; reste_especes: number }
interface CatRow { category: string; total: number }

export default async function RapportsPage() {
  const ctx = await resolveTenant();
  if (!ctx) redirect("/login");

  const data = await runWithTenant({ tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role }, async () => {
    const month = (
      await db.query<{ ca: number; dep: number; n: number }>(
        `SELECT COALESCE(SUM(total_ca),0)::numeric ca, COALESCE(SUM(total_depense),0)::numeric dep, count(*)::int n
           FROM cash_sheets WHERE date_trunc('month', entry_date) = date_trunc('month', CURRENT_DATE)`,
      )
    ).rows[0];
    const sheets = (
      await db.query<Sheet>(
        "SELECT entry_date, total_ca, total_depense, reste_especes FROM cash_sheets ORDER BY entry_date DESC LIMIT 10",
      )
    ).rows;
    const byCat = (
      await db.query<CatRow>(
        `SELECT category, COALESCE(SUM(amount),0)::numeric total FROM expenses
          WHERE date_trunc('month', expense_date) = date_trunc('month', CURRENT_DATE)
          GROUP BY category ORDER BY total DESC`,
      )
    ).rows;
    const vendorDue = Number(
      (await db.query<{ bal: number }>(
        `SELECT COALESCE(SUM(CASE WHEN type='debt' THEN amount WHEN type='payment' THEN -amount ELSE 0 END),0)::numeric bal FROM vendor_transactions`,
      )).rows[0]?.bal ?? 0,
    );
    return { month, sheets, byCat, vendorDue };
  });

  const sheetCols: Column<Sheet>[] = [
    { key: "date", header: "Date", render: (s) => dateFR(s.entry_date.slice(0, 10)) },
    { key: "ca", header: "CA", numeric: true, render: (s) => money2(s.total_ca) },
    { key: "dep", header: "Dépenses", numeric: true, render: (s) => money2(s.total_depense) },
    { key: "reste", header: "Reste espèces", numeric: true, render: (s) => money2(s.reste_especes) },
  ];
  const catCols: Column<CatRow>[] = [
    { key: "cat", header: "Catégorie", render: (c) => EXPENSE_CATEGORY_LABELS[c.category] ?? c.category },
    { key: "total", header: "Total", numeric: true, render: (c) => money2(c.total) },
  ];

  return (
    <>
      <PageHeader title="Rapports" subtitle="Vue d’ensemble du mois en cours." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="CA du mois" value={money(data.month.ca)} icon={<LineChart className="h-5 w-5" />} tone="accent" hint={`${data.month.n} feuille${data.month.n > 1 ? "s" : ""}`} />
        <StatCard label="Dépenses du mois" value={money(data.month.dep)} tone="warning" />
        <StatCard label="Solde du mois" value={money(Number(data.month.ca) - Number(data.month.dep))} tone={Number(data.month.ca) - Number(data.month.dep) >= 0 ? "positive" : "danger"} />
        <StatCard label="Dû aux fournisseurs" value={money(data.vendorDue)} tone={data.vendorDue > 0 ? "danger" : "positive"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Dernières feuilles de caisse</CardTitle></CardHeader>
          <CardBody className="px-0 pb-0"><Table columns={sheetCols} rows={data.sheets} rowKey={(s) => s.entry_date} empty="Aucune feuille." /></CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Dépenses par catégorie (mois)</CardTitle></CardHeader>
          <CardBody className="px-0 pb-0"><Table columns={catCols} rows={data.byCat} rowKey={(c) => c.category} empty="Aucune dépense ce mois." /></CardBody>
        </Card>
      </div>
    </>
  );
}
