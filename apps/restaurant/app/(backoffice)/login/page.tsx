import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/supabase-server';
import { LoginForm } from '@/components/backoffice/auth/LoginForm';

export const metadata = {
  title: 'Login - Epictete Backoffice',
  description: 'Sign in to access the restaurant backoffice'
};

export default async function LoginPage() {
  const session = await getServerSession();

  // Redirect to admin if already logged in
  if (session) {
    redirect('/admin');
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f0e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <LoginForm />
    </div>
  );
}
