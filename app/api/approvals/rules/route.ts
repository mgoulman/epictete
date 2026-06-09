import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { enforce } from '@/lib/auth/supabase-server';

// GET /api/approvals/rules → all module rules (admin: settings.write)
export async function GET() {
  const denied = await enforce('settings.write'); if (denied) return denied;
  const { rows } = await db.query(
    'SELECT module, enabled, requester_roles, approver_roles FROM approval_rules ORDER BY module'
  );
  return NextResponse.json({ rules: rows });
}

// PATCH /api/approvals/rules → { module, enabled?, requester_roles?, approver_roles? }
export async function PATCH(request: NextRequest) {
  const denied = await enforce('settings.write'); if (denied) return denied;
  const { module, enabled, requester_roles, approver_roles } = await request.json().catch(() => ({}));
  if (!module) return NextResponse.json({ error: 'module required' }, { status: 400 });

  await db.query(
    `UPDATE approval_rules
     SET enabled         = COALESCE($2, enabled),
         requester_roles = COALESCE($3::text[], requester_roles),
         approver_roles  = COALESCE($4::text[], approver_roles),
         updated_at = now()
     WHERE module = $1`,
    [
      module,
      typeof enabled === 'boolean' ? enabled : null,
      Array.isArray(requester_roles) ? requester_roles : null,
      Array.isArray(approver_roles) ? approver_roles : null,
    ]
  );
  return NextResponse.json({ success: true });
}
