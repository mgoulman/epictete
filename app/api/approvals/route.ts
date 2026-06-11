import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from '@/lib/auth/supabase-server';
import { listPendingApprovals, reviewApproval, type ApprovalRequest } from '@/lib/approvals';

// Build a human-readable detail view of what a request would change.
async function buildDetails(req: ApprovalRequest) {
  const p = (req.payload || {}) as Record<string, unknown>;

  if (req.action === 'inventory_daily_purchase') {
    const body = (p.body || {}) as { items?: Array<Record<string, unknown>>; date?: string };
    const items = Array.isArray(body.items) ? body.items : [];
    const ids = items.map(i => i.inventory_item_id as string).filter(Boolean);
    const names = new Map<string, { name: string; unit: string }>();
    if (ids.length) {
      const { rows } = await db.query<{ id: string; name: string; unit: string }>(
        'SELECT id, name, unit FROM inventory_items WHERE id = ANY($1::uuid[])', [ids]
      );
      rows.forEach(r => names.set(r.id, { name: r.name, unit: r.unit }));
    }
    const lines = items.map(it => {
      const info = names.get(it.inventory_item_id as string);
      const qty = Number(it.quantity) || 0;
      const uc = Number(it.unit_cost) || 0;
      return { label: info?.name || (it.inventory_item_id as string), quantity: qty, unit: info?.unit || '', unit_cost: uc, total: qty * uc };
    });
    return { kind: 'achat', date: body.date, lines, total: lines.reduce((s, l) => s + l.total, 0) };
  }

  if (req.action === 'db_query') {
    const data = (p.data || {}) as Record<string, unknown>;
    const fields = Object.entries(data).map(([key, v]) => ({ key, value: typeof v === 'object' ? JSON.stringify(v) : String(v) }));
    return { kind: 'db_query', table: p.table as string, action: p.action as string, fields };
  }

  return { kind: 'generic', fields: Object.entries(p).map(([key, v]) => ({ key, value: typeof v === 'object' ? JSON.stringify(v) : String(v) })) };
}

// GET /api/approvals → pending requests the current user can approve (+ details)
export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const requests = await listPendingApprovals(session);
  const enriched = await Promise.all(requests.map(async r => ({ ...r, details: await buildDetails(r) })));
  return NextResponse.json({ requests: enriched });
}

// PATCH /api/approvals → { id, decision: 'approved'|'rejected', note? }
export async function PATCH(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, decision, note } = await request.json().catch(() => ({}));
  if (!id || (decision !== 'approved' && decision !== 'rejected')) {
    return NextResponse.json({ error: 'id and valid decision required' }, { status: 400 });
  }
  const result = await reviewApproval(id, decision, note ?? null, session);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}
