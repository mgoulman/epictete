'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '@/lib/auth/hooks';
import { PresenceCard } from '@/components/backoffice/PresenceCard';
import {
  RevenueWidget, VendorsOwedWidget, LowStockWidget, PresenceWidget,
  TimeOffWidget, ApprovalsWidget, MyTablesWidget,
} from '@/components/backoffice/dashboard/widgets';

// TEMPORARY test control — remove with /api/notifications/test once push is verified.
function TestNotificationButton() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const send = async () => {
    setState('sending');
    try {
      const res = await fetch('/api/notifications/test', { method: 'POST' });
      setState(res.ok ? 'sent' : 'error');
    } catch { setState('error'); }
    setTimeout(() => setState('idle'), 3000);
  };
  return (
    <button
      onClick={send}
      disabled={state === 'sending'}
      className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-[#606338]/50 text-[#606338] rounded-lg text-xs font-medium hover:bg-[#606338]/10 disabled:opacity-50 transition-colors"
    >
      <Bell className="w-3.5 h-3.5" />
      {state === 'sending' ? 'Envoi…' : state === 'sent' ? 'Envoyée ✓' : state === 'error' ? 'Échec ✕' : 'Tester une notification'}
    </button>
  );
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur', manager: 'Manager', finance: 'Finance', marketing: 'Marketing',
  cuisine: 'Cuisine', rh: 'Ressources Humaines', serveur: 'Serveur', intern: 'Stagiaire', regular: '',
};

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#606338] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const name = user?.full_name || user?.email?.split('@')[0] || '';
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {greet}{name ? `, ${name}` : ''} 👋
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {ROLE_LABELS[user?.role || ''] ? `${ROLE_LABELS[user!.role]} · ` : ''}Voici votre aperçu du jour.
        </p>
        {/* TEMPORARY — push test button (admin only); remove once verified. */}
        {user?.role === 'admin' && (
          <div className="mt-3">
            <TestNotificationButton />
          </div>
        )}
      </div>

      {/* Personal presence confirmation (linked staff scheduled today) */}
      <PresenceCard />

      {/* Role-aware KPI widgets — each renders only if the user has access */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MyTablesWidget />
        <RevenueWidget />
        <PresenceWidget />
        <ApprovalsWidget />
        <LowStockWidget />
        <VendorsOwedWidget />
        <TimeOffWidget />
      </div>
    </div>
  );
}
