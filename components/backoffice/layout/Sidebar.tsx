'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Users,
  UserCog,
  TrendingUp,
  FileText,
  DollarSign,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  LogOut,
  BookOpen,
  BarChart3,
  Package,
  Upload,
  Download,
  Armchair,
  Map,
  ClipboardList,
  Calendar,
  Table,
  Receipt,
  ArrowUpDown,
  Bus,
  ShoppingCart
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth, usePermissions } from '@/lib/auth/hooks';
import { usePWA } from '@/components/backoffice/PWAProvider';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { BACKOFFICE_NAV } from '@/lib/types/auth';
import type { PermissionName, NavItem } from '@/lib/types/auth';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  UtensilsCrossed,
  Users,
  UserCog,
  Megaphone: TrendingUp,
  TrendingUp,
  FileText,
  DollarSign,
  ScrollText,
  Settings,
  BookOpen,
  BarChart3,
  Package,
  Upload,
  Armchair,
  Map,
  ClipboardList,
  Calendar,
  Table,
  Receipt,
  ArrowUpDown,
  Bus,
  ShoppingCart
};

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ isCollapsed, onToggle, isMobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { hasPermission, isAdmin } = usePermissions();
  const { isInstalled, canInstall, triggerInstall } = usePWA();
  const { t } = useTranslation();

  const navLabels = t.backoffice.nav as Record<string, string>;
  const getNavLabel = (item: NavItem) => navLabels[item.key] || item.label;

  // Track expanded state for items with children
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Initialize expanded state based on defaultOpen and current path
  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    BACKOFFICE_NAV.forEach(item => {
      if (item.children) {
        const isChildActive = item.children.some(child => {
          const childPath = child.href.split('?')[0];
          return pathname === childPath || pathname.startsWith(childPath + '/');
        });
        initialExpanded[item.href] = item.defaultOpen || isChildActive;
      }
    });
    setExpandedItems(initialExpanded);
  }, [pathname]);

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [href]: !prev[href]
    }));
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  const canSee = (item: NavItem) => {
    if (!item.permission) return true;
    if (isAdmin()) return true;
    return hasPermission(item.permission as PermissionName);
  };

  // Filter top-level items by permission, filter each item's children too, and
  // drop any parent group whose children all got filtered out.
  const filteredNav = BACKOFFICE_NAV
    .filter(canSee)
    .map(item =>
      item.children ? { ...item, children: item.children.filter(canSee) } : item
    )
    .filter(item => !item.children || item.children.length > 0);

  // Check if a nav item or any of its children are active
  const isItemActive = (item: NavItem): boolean => {
    const itemPath = item.href.split('?')[0];
    const itemTab = new URL(item.href, 'http://x').searchParams.get('tab');
    const currentTab = searchParams.get('tab');

    // For items with query params (like finance tabs)
    if (itemTab) {
      return pathname === itemPath && currentTab === itemTab;
    }

    // For regular items
    if (item.children) {
      return item.children.some(child => isItemActive(child));
    }

    return pathname === itemPath || (itemPath !== '/admin' && pathname.startsWith(itemPath + '/'));
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] md:hidden"
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 h-full bg-secondary border-r border-border z-50
          flex flex-col transition-all duration-200
          ${isCollapsed ? 'w-[72px]' : 'w-[260px]'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        {/* Logo + Collapse Toggle */}
        <div className={`
          h-16 flex items-center border-b border-border
          ${isCollapsed ? 'justify-center px-2' : 'justify-between pl-5 pr-3'}
        `}>
          <Link href="/admin" className={`flex items-center gap-3 no-underline ${isCollapsed ? '' : 'flex-1 min-w-0'}`}>
            <div className="w-10 h-10 rounded-xl bg-[#EDE6D6] flex items-center justify-center shadow-lg shadow-[#606338]/10 shrink-0 overflow-hidden">
              <Image
                src="/logos/logo-icon.png"
                alt="Epictète"
                width={40}
                height={40}
                className="w-10 h-10 object-cover"
              />
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <span className="text-[15px] font-semibold text-foreground block">Epictète</span>
                <span className="text-[11px] text-muted-foreground block">{t.backoffice.sidebar.backoffice}</span>
              </div>
            )}
          </Link>

          {/* Desktop collapse toggle - only when expanded */}
          {!isCollapsed && (
            <button
              onClick={onToggle}
              className="hidden md:flex items-center justify-center w-7 h-7 rounded-md border border-border bg-card text-muted-foreground hover:bg-secondary hover:border-muted hover:text-foreground transition-all shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Mobile close button */}
          {!isCollapsed && (
            <button
              onClick={onMobileClose}
              className="flex md:hidden items-center justify-center w-8 h-8 rounded-lg bg-transparent text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div className="hidden md:flex justify-center py-2 border-b border-border">
            <button
              onClick={onToggle}
              className="flex items-center justify-center w-10 h-8 rounded-lg border border-border bg-card text-muted-foreground hover:bg-secondary hover:border-muted hover:text-foreground transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="flex flex-col gap-1">
            {filteredNav.map((item) => {
              const Icon = iconMap[item.icon] || LayoutDashboard;
              const isActive = isItemActive(item);
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedItems[item.href];

              // For items with children, render parent + collapsible children
              if (hasChildren && !isCollapsed) {
                return (
                  <div key={item.href}>
                    {/* Parent item - clickable to expand/collapse */}
                    <button
                      onClick={() => toggleExpanded(item.href)}
                      className={`
                        w-full flex items-center gap-3 rounded-lg transition-all py-2.5 px-3
                        ${isActive
                          ? 'bg-[#606338]/10 text-[#606338]'
                          : 'text-muted-foreground hover:bg-card hover:text-foreground'
                        }
                      `}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                      <span className="text-[13px] font-medium flex-1 text-left">{getNavLabel(item)}</span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {/* Children - collapsible */}
                    <div
                      className={`
                        overflow-hidden transition-all duration-200
                        ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
                      `}
                    >
                      <div className="ml-4 pl-3 border-l border-border/50 mt-1 flex flex-col gap-0.5">
                        {item.children!.map((child) => {
                          const ChildIcon = iconMap[child.icon] || LayoutDashboard;
                          const isChildActive = isItemActive(child);

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={onMobileClose}
                              className={`
                                flex items-center gap-2.5 rounded-md no-underline transition-all py-2 px-2.5
                                ${isChildActive
                                  ? 'bg-[#606338]/10 text-[#606338]'
                                  : 'text-muted-foreground hover:bg-card hover:text-foreground'
                                }
                              `}
                            >
                              <ChildIcon className="w-4 h-4 shrink-0" />
                              <span className="text-[12px] font-medium">{getNavLabel(child)}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              // For collapsed sidebar with children, just show parent
              if (hasChildren && isCollapsed) {
                return (
                  <Link
                    key={item.href}
                    href={item.children![0].href}
                    title={getNavLabel(item)}
                    onClick={onMobileClose}
                    className={`
                      flex items-center gap-3 rounded-lg no-underline transition-all py-2.5 justify-center
                      ${isActive
                        ? 'bg-[#606338]/10 text-[#606338]'
                        : 'text-muted-foreground hover:bg-card hover:text-foreground'
                      }
                    `}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                  </Link>
                );
              }

              // Regular items without children
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? getNavLabel(item) : undefined}
                  onClick={onMobileClose}
                  className={`
                    flex items-center gap-3 rounded-lg no-underline transition-all
                    ${isCollapsed ? 'py-2.5 justify-center' : 'py-2.5 px-3'}
                    ${isActive
                      ? 'bg-[#606338]/10 text-[#606338]'
                      : 'text-muted-foreground hover:bg-card hover:text-foreground'
                    }
                  `}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  {!isCollapsed && (
                    <span className="text-[13px] font-medium">{getNavLabel(item)}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User + Logout */}
        {user && (
          <div className="border-t border-border p-3">
            <div className={`flex items-center gap-3 p-2 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#606338] to-[#4d4f2e] flex items-center justify-center text-[13px] font-semibold text-white shrink-0">
                {getInitials(user.full_name)}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground m-0 truncate">
                    {user.full_name || user.email}
                  </p>
                  <p className="text-[11px] text-muted-foreground m-0 capitalize">
                    {user.role}
                  </p>
                </div>
              )}
            </div>

            {/* Install App button */}
            {canInstall && !isInstalled && (
              <button
                onClick={triggerInstall}
                title={isCollapsed ? t.backoffice.sidebar.installApp : undefined}
                className={`
                  w-full flex items-center gap-3 rounded-lg transition-all mt-2
                  ${isCollapsed ? 'py-2.5 justify-center' : 'py-2.5 px-3'}
                  text-[#606338] hover:bg-[#606338]/10
                `}
              >
                <Download className="w-[18px] h-[18px] shrink-0" />
                {!isCollapsed && (
                  <span className="text-[13px] font-medium">{t.backoffice.sidebar.installApp}</span>
                )}
              </button>
            )}

            {/* Logout button */}
            <button
              onClick={handleSignOut}
              title={isCollapsed ? t.backoffice.sidebar.signOut : undefined}
              className={`
                w-full flex items-center gap-3 rounded-lg transition-all mt-2
                ${isCollapsed ? 'py-2.5 justify-center' : 'py-2.5 px-3'}
                text-red-500 hover:bg-red-500/10
              `}
            >
              <LogOut className="w-[18px] h-[18px] shrink-0" />
              {!isCollapsed && (
                <span className="text-[13px] font-medium">{t.backoffice.sidebar.signOut}</span>
              )}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
