'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Settings, Menu, Search, Bell, ChevronRight, Home, Download, Globe } from 'lucide-react';
import { useAuth } from '@/lib/auth/hooks';
import { usePWA } from '@/components/backoffice/PWAProvider';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface HeaderProps {
  sidebarCollapsed: boolean;
  onMobileMenuClick: () => void;
}

type PageTitles = Record<string, { title: string; description: string }>;

const PAGE_KEYS: Record<string, string> = {
  '/admin': 'dashboard',
  '/admin/menu': 'menu',
  '/admin/users': 'users',
  '/admin/marketing': 'marketing',
  '/admin/finance': 'finance',
  '/admin/audit': 'audit',
  '/admin/settings': 'settings',
  '/admin/docs': 'docs',
  '/admin/personnel': 'personnel',
  '/admin/transport': 'transport',
  '/admin/salle': 'salle',
  '/admin/recipes': 'recipes',
  '/admin/menus': 'menus',
};

function getPageTitles(t: ReturnType<typeof useTranslation>['t']): PageTitles {
  const pages = t.backoffice.header.pages as Record<string, { title: string; description: string }>;
  const result: PageTitles = {};
  for (const [path, key] of Object.entries(PAGE_KEYS)) {
    if (pages[key]) {
      result[path] = pages[key];
    }
  }
  return result;
}

function getBreadcrumbs(pathname: string, pageTitles: PageTitles, homeLabel: string): { label: string; href: string }[] {
  const crumbs: { label: string; href: string }[] = [
    { label: homeLabel, href: '/admin' }
  ];

  if (pathname === '/admin') return crumbs;

  const segments = pathname.split('/').filter(Boolean);
  let path = '';

  for (let i = 1; i < segments.length; i++) {
    path += '/' + segments[i];
    const fullPath = '/admin' + (i > 1 ? path : '/' + segments[i]);
    const pageInfo = pageTitles[fullPath];
    crumbs.push({
      label: pageInfo?.title || segments[i].charAt(0).toUpperCase() + segments[i].slice(1),
      href: fullPath
    });
  }

  return crumbs;
}

export function Header({ sidebarCollapsed, onMobileMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { isInstalled, canInstall, triggerInstall } = usePWA();
  const { t, locale, setLocale } = useTranslation();

  const pageTitles = getPageTitles(t);
  const pageInfo = pageTitles[pathname] || { title: 'Page', description: '' };
  const breadcrumbs = getBreadcrumbs(pathname, pageTitles, t.backoffice.header.home);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header
      className={`
        fixed top-0 right-0 h-16 bg-secondary border-b border-border
        flex items-center justify-between px-4 md:px-6 z-30 gap-4 transition-all duration-200
        left-0 md:left-[72px] ${!sidebarCollapsed ? 'md:left-[260px]' : ''}
      `}
    >
      {/* Left section: Mobile menu + Breadcrumbs/Title */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Mobile menu button */}
        <button
          onClick={onMobileMenuClick}
          className="flex md:hidden items-center justify-center w-10 h-10 rounded-lg border border-border bg-card text-foreground shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumbs + Title */}
        <div className="min-w-0 overflow-hidden">
          {/* Breadcrumbs */}
          <div className="hidden md:flex items-center gap-1.5 mb-0.5">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center gap-1.5">
                {index > 0 && <ChevronRight className="w-3 h-3 text-muted" />}
                {index === breadcrumbs.length - 1 ? (
                  <span className="text-[11px] text-muted-foreground">{crumb.label}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-[11px] text-muted no-underline flex items-center gap-1 hover:text-[#606338]"
                  >
                    {index === 0 && <Home className="w-2.5 h-2.5" />}
                    {crumb.label}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Page title */}
          <h1 className="text-base font-semibold text-foreground m-0 truncate">
            {pageInfo.title}
          </h1>
        </div>
      </div>

      {/* Center section: Search */}
      <div className="hidden md:flex flex-[0_1_400px] lg:flex-[0_1_400px]">
        <div className="relative w-full">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isSearchFocused ? 'text-[#606338]' : 'text-muted'}`} />
          <input
            type="text"
            placeholder={t.backoffice.header.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className={`
              w-full py-2.5 pl-10 pr-12 rounded-lg text-[13px] text-foreground outline-none transition-all bg-card
              ${isSearchFocused
                ? 'border border-[#606338]/40'
                : 'border border-border'
              }
            `}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-secondary rounded text-[10px] text-muted font-mono">
            ⌘K
          </span>
        </div>
      </div>

      {/* Right section: Notifications + Profile */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Install App */}
        {canInstall && !isInstalled && (
          <button
            onClick={triggerInstall}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#606338] text-white text-sm font-medium hover:bg-[#4d4f2e] transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t.backoffice.header.install}</span>
          </button>
        )}

        {/* Language Toggle */}
        <button
          onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
          className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-border bg-transparent text-muted-foreground hover:bg-card hover:border-muted hover:text-foreground transition-all"
          title={t.backoffice.shared.language}
        >
          <Globe className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase">{locale}</span>
        </button>

        {/* Notifications */}
        <button className="hidden md:flex relative items-center justify-center w-10 h-10 rounded-lg border border-border bg-transparent text-muted-foreground hover:bg-card hover:border-muted hover:text-foreground transition-all">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#606338]" />
        </button>

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`
              flex items-center gap-3 py-1.5 pl-1.5 pr-3 rounded-lg border transition-all
              ${isProfileOpen
                ? 'bg-card border-muted'
                : 'bg-transparent border-border hover:bg-card hover:border-muted'
              }
            `}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#606338] to-[#4d4f2e] flex items-center justify-center text-white text-[13px] font-semibold">
              {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-[13px] font-medium text-foreground m-0">
                {user?.full_name || 'User'}
              </p>
              <p className="text-[11px] text-muted-foreground m-0 capitalize">
                {user?.role}
              </p>
            </div>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-[220px] bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
              {/* User info */}
              <div className="p-4 border-b border-border">
                <p className="text-sm font-medium text-foreground m-0">
                  {user?.full_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground mt-1 m-0">
                  {user?.email}
                </p>
                <span className="inline-block mt-2 px-2 py-1 text-[11px] rounded-md bg-[#606338]/10 text-[#606338] capitalize font-medium">
                  {user?.role}
                </span>
              </div>

              {/* Menu items */}
              <div className="p-2">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    router.push('/admin/settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-transparent hover:bg-secondary transition-colors text-left"
                >
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[13px] text-foreground">{t.backoffice.nav.settings}</span>
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-transparent hover:bg-red-500/10 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span className="text-[13px] text-red-500">{t.backoffice.sidebar.signOut}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
