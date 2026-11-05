import { AuthProvider } from '@/lib/auth/hooks';
import { BackofficeShell } from '@/components/backoffice/layout/BackofficeShell';
import { ThemeProvider } from '@/components/theme-provider';
import { LanguageProvider } from '@/lib/i18n/context';
import { ToastProvider } from '@/components/backoffice/ToastProvider';
import { BackofficeErrorNet } from '@/components/GlobalErrorNet';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Backoffice - Epictete Restaurant',
    template: '%s | Epictete Backoffice'
  },
  description: 'Gestion du restaurant Epictete - Ventes, Menu',
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function BackofficeLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider defaultTheme="system">
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <BackofficeErrorNet />
            <BackofficeShell>{children}</BackofficeShell>
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
