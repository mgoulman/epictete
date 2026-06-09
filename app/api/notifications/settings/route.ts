import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { enforce } from '@/lib/auth/supabase-server';

interface SettingRow {
  type: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

// GET /api/notifications/settings → all per-type settings (any authenticated user)
export async function GET() {
  const denied = await enforce(); if (denied) return denied;
  const { rows } = await db.query<SettingRow>(
    'SELECT type, enabled, config FROM notification_settings ORDER BY type'
  );
  return NextResponse.json({ settings: rows });
}

// PATCH /api/notifications/settings → { type, enabled?, config? } (admin: settings.write)
export async function PATCH(request: NextRequest) {
  const denied = await enforce('settings.write'); if (denied) return denied;
  const { type, enabled, config } = await request.json().catch(() => ({}));
  if (!type) return NextResponse.json({ error: 'type required' }, { status: 400 });

  await db.query(
    `UPDATE notification_settings
     SET enabled = COALESCE($2, enabled),
         config  = COALESCE($3::jsonb, config),
         updated_at = now()
     WHERE type = $1`,
    [type, typeof enabled === 'boolean' ? enabled : null, config ? JSON.stringify(config) : null]
  );
  return NextResponse.json({ success: true });
}
