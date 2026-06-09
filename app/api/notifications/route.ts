import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from '@/lib/auth/supabase-server';
import { generateLowStockNotifications } from '@/lib/notifications';

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string | null;
  severity: string;
  link: string | null;
  required_permission: string | null;
  target_roles: string[] | null;
  target_users: string[] | null;
  is_read: boolean;
  created_at: string;
}

// GET /api/notifications → notifications visible to the current user + unread count
export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Refresh data-driven alerts (cheap; idempotent via dedup_key).
  try { await generateLowStockNotifications(); } catch { /* best-effort */ }

  const { rows } = await db.query<NotificationRow>(
    `SELECT id, type, title, message, severity, link, required_permission, target_roles, target_users, is_read, created_at
     FROM notifications ORDER BY created_at DESC LIMIT 50`
  );

  const isAdmin = session.role === 'admin';
  const visible = rows.filter(n => {
    if (isAdmin) return true;
    const hasTargets = (n.target_roles && n.target_roles.length) || (n.target_users && n.target_users.length);
    if (hasTargets) {
      return (n.target_roles || []).includes(session.role) || (n.target_users || []).includes(session.id);
    }
    return !n.required_permission || session.permissions.includes(n.required_permission as never);
  });
  const unread = visible.filter(n => !n.is_read).length;

  return NextResponse.json({ notifications: visible, unread });
}

// PATCH /api/notifications → { id } to mark one read, or { all: true } to mark all read
export async function PATCH(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (body.all) {
    await db.query('UPDATE notifications SET is_read = true, read_at = now() WHERE is_read = false');
  } else if (body.id) {
    await db.query('UPDATE notifications SET is_read = true, read_at = now() WHERE id = $1', [body.id]);
  } else {
    return NextResponse.json({ error: 'id or all required' }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
