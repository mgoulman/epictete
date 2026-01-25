import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/supabase-server';
import { getAuditLogs } from '@/lib/auth/audit';

// GET /api/audit - List audit logs
export async function GET(request: Request) {
  try {
    await requirePermission('audit.read');

    const url = new URL(request.url);
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
