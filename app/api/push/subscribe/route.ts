import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from '@/lib/auth/supabase-server';
import { getVapidPublicKey, isPushConfigured } from '@/lib/push';

// GET → expose the VAPID public key + whether push is configured (for the client)
export async function GET() {
  return NextResponse.json({ publicKey: getVapidPublicKey(), enabled: isPushConfigured() });
}

// POST → store a push subscription for the current user
export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sub = await request.json().catch(() => null);
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  await db.query(
    `INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_id, user_agent)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, user_id = EXCLUDED.user_id`,
    [endpoint, p256dh, auth, session.id, request.headers.get('user-agent')]
  );
  return NextResponse.json({ success: true });
}

// DELETE → remove a subscription by endpoint
export async function DELETE(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const endpoint = new URL(request.url).searchParams.get('endpoint');
  if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 });
  await db.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
  return NextResponse.json({ success: true });
}
