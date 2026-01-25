import { AuthProvider } from '@/lib/auth/hooks';
import { BackofficeShell } from '@/components/backoffice/layout/BackofficeShell';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata = {
  title: {
    default: 'Backoffice - Epictete Restaurant',
    template: '%s | Epictete Backoffice'
  }
};

export default function BackofficeLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider defaultTheme="system">
      <AuthProvider>
        <BackofficeShell>{children}</BackofficeShell>
      </AuthProvider>
    </ThemeProvider>
  );
}
