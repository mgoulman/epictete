import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/supabase-server';
import { listPendingApprovals, reviewApproval } from '@/lib/approvals';

// GET /api/approvals → pending requests the current user can approve
export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const requests = await listPendingApprovals(session);
  return NextResponse.json({ requests });
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
