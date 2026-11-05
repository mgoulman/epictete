'use client';

import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth/hooks';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur', manager: 'Manager', finance: 'Finance', marketing: 'Marketing',
  cuisine: 'Cuisine', rh: 'Ressources Humaines', intern: 'Stagiaire', regular: '',
};

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const name = user?.full_name || user?.email?.split('@')[0] || '';
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div className="space-y-6">
      {/* Greeting — command hero */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-[var(--radius-lg)] text-white shadow-[var(--shadow-hero)]"
        style={{ backgroundImage: 'var(--gradient-hero)' }}
      >
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'var(--gradient-hero-sheen)' }} />
        <div className="relative p-6 lg:p-7">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55">Tableau de bord</div>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {greet}{name ? `, ${name}` : ''}
          </h1>
          <p className="text-white/70 mt-1 text-sm">
            {ROLE_LABELS[user?.role || ''] ? `${ROLE_LABELS[user!.role]} · ` : ''}Voici votre aperçu du jour.
          </p>
        </div>
      </motion.section>

    </div>
  );
}
