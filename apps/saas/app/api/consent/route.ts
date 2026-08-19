import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const CONSENT_VERSION = "pilot-2026-08";

// POST /api/consent → record the owner's acceptance of the pilot terms.
export async function POST() {
  return withTenant(async (ctx) => {
    await db.query(
      `INSERT INTO analytics_events (tenant_id, user_id, event, props)
       VALUES ($1, $2, 'consent.accepted', $3::jsonb)`,
      [ctx.tenantId, ctx.userId ?? null, JSON.stringify({ version: CONSENT_VERSION, via: "owner" })],
    );
    return NextResponse.json({ ok: true });
  });
}
