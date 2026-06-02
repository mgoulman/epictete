import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';
import { verifyJWT } from '@/lib/auth/supabase-server';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (token) {
    try {
      const payload = await verifyJWT(token);
      if (payload?.sub) {
        const ipAddress =
          request.headers.get('x-forwarded-for')?.split(',')[0] ||
          request.headers.get('x-real-ip') ||
          null;
        await db.query(
          `INSERT INTO audit_logs (user_id, action, resource_type, ip_address, user_agent)
           VALUES ($1, 'logout', 'auth', $2, $3)`,
          [payload.sub, ipAddress, request.headers.get('user-agent')]
        );
      }
    } catch {
      // never block logout on audit failure
    }
  }

  cookieStore.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return NextResponse.json({ success: true });
}
