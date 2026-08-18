// TEMPORARY — test endpoint to fire a sample notification (in-app + push).
// Remove this route and the dashboard button once push is confirmed working.
import { NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/handler';
import { enforce, getCurrentUserId } from '@/lib/auth/supabase-server';
import { createAuditLog } from '@/lib/auth/audit';
import { createNotification } from '@/lib/notifications';

export const POST = withErrorHandler(async () => {
  const denied = await enforce('settings.write'); if (denied) return denied;
  const userId = await getCurrentUserId();
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
  await createAuditLog({ userId, action: 'test', resourceType: 'notification', resourceId: id ? String(id) : null });
  return NextResponse.json({ success: true, id });
});
