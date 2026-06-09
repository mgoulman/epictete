'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/hooks';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import Image from 'next/image';

interface BackofficeShellProps {
  children: React.ReactNode;
}

export function BackofficeShell({ children }: BackofficeShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const { user, isLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    if (saved !== null) {
      setSidebarCollapsed(JSON.parse(saved));
    }
  }, []);

  // Show splash once per session for 3 seconds
  useEffect(() => {
    if (pathname === '/login') return;
    const seen = sessionStorage.getItem('backoffice-splash-seen');
    if (seen) {
      setSplashDone(true);
      return;
    }
    setShowSplash(true);
    const timer = setTimeout(() => {
      setShowSplash(false);
      setSplashDone(true);
      sessionStorage.setItem('backoffice-splash-seen', 'true');
    }, 3000);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  // Close mobile sidebar on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSidebarToggle = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebar_collapsed', JSON.stringify(newState));
  };

  const handleMobileMenuClick = () => {
    setIsMobileSidebarOpen(true);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  useEffect(() => {
    if (!isLoading && !user && pathname !== '/login') {
      router.push('/login');
    }
    // Redirect waiters (serveur) to service view when they hit the dashboard
    if (!isLoading && user && user.role === 'serveur' && pathname === '/admin') {
      router.push('/admin/salle/service');
    }
  }, [user, isLoading, router, pathname]);

  // Login page should render immediately without auth check
  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (isLoading || showSplash) {
    return (
      <div className="min-h-screen bg-[#F0E7CE] flex flex-col items-center justify-center">
        <div className="relative w-40 h-40 mb-6 animate-pulse">
          <Image
            src="/logos/logo-icon.png"
            alt="Epictete"
            fill
            className="object-contain"
            priority
          />
        </div>
        <div className="w-8 h-8 border-3 border-[#606338] border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-[#606338] text-sm font-medium">{t.backoffice.loading}</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggle={handleSidebarToggle}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={handleMobileSidebarClose}
        />
      </Suspense>
      <Header
        sidebarCollapsed={sidebarCollapsed}
        onMobileMenuClick={handleMobileMenuClick}
      />

      <main
        className={`
          pt-16 min-h-screen transition-all duration-200
          pl-0 md:pl-[72px] ${!sidebarCollapsed ? 'md:pl-[260px]' : ''}
        `}
      >
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
