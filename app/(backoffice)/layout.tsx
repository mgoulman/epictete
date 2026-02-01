import { AuthProvider } from '@/lib/auth/hooks';
import { BackofficeShell } from '@/components/backoffice/layout/BackofficeShell';
import { ThemeProvider } from '@/components/theme-provider';
import { PWAProvider } from '@/components/backoffice/PWAProvider';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Backoffice - Epictete Restaurant',
    template: '%s | Epictete Backoffice'
  },
  description: 'Gestion du restaurant Epictete - Personnel, Inventaire, Ventes, Menu',
  manifest: '/backoffice-manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/backoffice-icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon-backoffice.png', sizes: '180x180' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Epictete Backoffice',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#606338',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function BackofficeLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider defaultTheme="system">
      <AuthProvider>
        <PWAProvider>
          <BackofficeShell>{children}</BackofficeShell>
        </PWAProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
