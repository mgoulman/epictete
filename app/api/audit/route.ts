import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/supabase-server';
import { getAuditLogs } from '@/lib/auth/audit';
import db from '@/lib/db';

// GET /api/audit - List audit logs
//   ?metadata=1 → returns distinct resource types + users that have audit
//   entries, for populating filter dropdowns.
export async function GET(request: Request) {
  try {
    await requirePermission('audit.read');

    const url = new URL(request.url);

    if (url.searchParams.get('metadata') === '1') {
      const [{ rows: resourceRows }, { rows: userRows }] = await Promise.all([
        db.query<{ resource_type: string }>(
          `SELECT DISTINCT resource_type FROM audit_logs
            WHERE resource_type IS NOT NULL
            ORDER BY resource_type`
        ),
        db.query<{ user_id: string; user_email: string | null }>(
          `SELECT user_id, MAX(user_email) AS user_email FROM audit_logs
            WHERE user_id IS NOT NULL
            GROUP BY user_id
            ORDER BY user_email NULLS LAST`
        ),
      ]);
      return NextResponse.json({
        resourceTypes: resourceRows.map(r => r.resource_type),
        users: userRows.map(r => ({ id: r.user_id, email: r.user_email })),
      });
    }

    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const userId = url.searchParams.get('userId') || undefined;
    const resourceType = url.searchParams.get('resourceType') || undefined;
    const action = url.searchParams.get('action') || undefined;
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;

    const { data, count } = await getAuditLogs({
      limit,
      offset,
      userId,
      resourceType,
      action,
      startDate,
      endDate
    });

    return NextResponse.json({
      logs: data,
      total: count,
      limit,
      offset
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (err.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
