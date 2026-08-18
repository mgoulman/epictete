import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/auth";
import {
  computeTotals,
  num,
  type CaisseData,
  type DepenseItem,
  type PaymentSource,
} from "@/lib/caisse";

export const dynamic = "force-dynamic";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function rowToCaisse(row: Record<string, unknown>): CaisseData {
  const paid = Array.isArray(row.paid_items) ? row.paid_items : [];
  return {
    entry_date: String(row.entry_date).slice(0, 10),
    total_ca: num(row.total_ca),
    total_cb: num(row.total_cb),
    glovo_ttc_espece: num(row.glovo_ttc_espece),
    glovo_ttc_online: num(row.glovo_ttc_online),
    payment_sources: (Array.isArray(row.payment_sources) ? row.payment_sources : []).map(
      (s: Record<string, unknown>): PaymentSource => ({
        name: String(s?.name ?? ""),
        amount: num(s?.amount),
        counts_as_cash: !!s?.counts_as_cash,
      }),
    ),
    depenses: paid.map(
      (d: Record<string, unknown>): DepenseItem => ({
        label: String(d?.label ?? ""),
        amount: num(d?.amount),
      }),
    ),
    manager_name: String(row.manager_name ?? ""),
    especes_note: String(row.especes_note ?? ""),
  };
}

// GET /api/caisse?date=YYYY-MM-DD → the sheet for that date (or null if none yet)
export async function GET(req: Request) {
  return withTenant(async () => {
    const date = new URL(req.url).searchParams.get("date") ?? "";
    if (!ISO_DATE.test(date)) {
      return NextResponse.json({ error: "date invalide" }, { status: 400 });
    }
    const { rows } = await db.query<Record<string, unknown>>(
      "SELECT * FROM cash_sheets WHERE entry_date = $1 LIMIT 1",
      [date],
    );
    return NextResponse.json({ sheet: rows[0] ? rowToCaisse(rows[0]) : null });
  });
}

// POST /api/caisse → upsert the sheet for its date, recomputing totals server-side.
export async function POST(req: Request) {
  return withTenant(async (ctx) => {
    let body: CaisseData;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "corps invalide" }, { status: 400 });
    }
    const date = String(body.entry_date ?? "").slice(0, 10);
    if (!ISO_DATE.test(date)) {
      return NextResponse.json({ error: "date invalide" }, { status: 400 });
    }

    const paymentSources: PaymentSource[] = Array.isArray(body.payment_sources)
      ? body.payment_sources
          .filter((s) => (s?.name ?? "").trim() !== "" || num(s?.amount) !== 0)
          .map((s) => ({ name: String(s.name ?? "").trim(), amount: num(s.amount), counts_as_cash: !!s.counts_as_cash }))
      : [];
    const depenses: DepenseItem[] = Array.isArray(body.depenses)
      ? body.depenses
          .filter((d) => (d?.label ?? "").trim() !== "" || num(d?.amount) !== 0)
          .map((d) => ({ label: String(d.label ?? "").trim(), amount: num(d.amount) }))
      : [];

    const t = computeTotals({
      total_ca: body.total_ca,
      total_cb: body.total_cb,
      glovo_ttc_espece: body.glovo_ttc_espece,
      glovo_ttc_online: body.glovo_ttc_online,
      payment_sources: paymentSources,
      depenses,
    });

    // default branch for this tenant (nullable)
    const branch =
      (await db.query<{ id: string }>("SELECT id FROM branches ORDER BY is_default DESC, name LIMIT 1")).rows[0]
        ?.id ?? null;

    const { rows } = await db.query<Record<string, unknown>>(
      `INSERT INTO cash_sheets
         (tenant_id, branch_id, entry_date, total_ca, total_cb, glovo_ttc_espece, glovo_ttc_online,
          payment_sources, paid_items, total_depense, total_especes_caisse, total_especes,
          reste_especes, manager_name, especes_note, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12,$13,$14,$15,'saas')
       ON CONFLICT (tenant_id, entry_date) DO UPDATE SET
         branch_id = EXCLUDED.branch_id,
         total_ca = EXCLUDED.total_ca, total_cb = EXCLUDED.total_cb,
         glovo_ttc_espece = EXCLUDED.glovo_ttc_espece, glovo_ttc_online = EXCLUDED.glovo_ttc_online,
         payment_sources = EXCLUDED.payment_sources, paid_items = EXCLUDED.paid_items,
         total_depense = EXCLUDED.total_depense, total_especes_caisse = EXCLUDED.total_especes_caisse,
         total_especes = EXCLUDED.total_especes, reste_especes = EXCLUDED.reste_especes,
         manager_name = EXCLUDED.manager_name, especes_note = EXCLUDED.especes_note,
         updated_at = now()
       RETURNING *`,
      [
        ctx.tenantId,
        branch,
        date,
        num(body.total_ca),
        num(body.total_cb),
        num(body.glovo_ttc_espece),
        num(body.glovo_ttc_online),
        JSON.stringify(paymentSources),
        JSON.stringify(depenses),
        t.totalDepense,
        t.caisseEspeces,
        t.totalEspeces,
        t.resteEspeces,
        String(body.manager_name ?? "").trim(),
        String(body.especes_note ?? "").trim(),
      ],
    );

    // Activation signal — "Feuille de Caisse enregistrée".
    try {
      await db.query(
        `INSERT INTO analytics_events (tenant_id, branch_id, user_id, event, props)
         VALUES ($1, $2, $3, 'cash_sheet.saved', $4::jsonb)`,
        [ctx.tenantId, branch, ctx.userId ?? null, JSON.stringify({ entry_date: date, total_ca: num(body.total_ca) })],
      );
    } catch {
      /* analytics is best-effort */
    }

    return NextResponse.json({ sheet: rowToCaisse(rows[0]), totals: t });
  });
}
