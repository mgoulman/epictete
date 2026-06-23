// TEMPORARY — test endpoint to fire a sample notification (in-app + push).
// Remove this route and the dashboard button once push is confirmed working.
import { NextResponse } from 'next/server';
import { enforce } from '@/lib/auth/supabase-server';
import { createNotification } from '@/lib/notifications';

export async function POST() {
  const denied = await enforce('settings.write'); if (denied) return denied;
  const time = new Date().toLocaleTimeString('fr-FR');
  const id = await createNotification({
    type: 'test',
    title: '🔔 Notification de test',
    message: `Ceci est une notification de test envoyée à ${time}.`,
    severity: 'info',
    link: '/admin',
    system: true, // bypass settings + always push to all subscriptions
    push: true,
  });
  return NextResponse.json({ success: true, id });
}
