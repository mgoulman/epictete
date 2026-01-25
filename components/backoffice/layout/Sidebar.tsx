'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Users,
  TrendingUp,
  FileText,
  DollarSign,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useAuth, usePermissions } from '@/lib/auth/hooks';
import { BACKOFFICE_NAV } from '@/lib/types/auth';
import type { PermissionName } from '@/lib/types/auth';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  UtensilsCrossed,
  Users,
  Megaphone: TrendingUp,
  FileText,
  DollarSign,
  ScrollText,
  Settings
};

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ isCollapsed, onToggle, isMobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { hasPermission, isAdmin } = usePermissions();

  const filteredNav = BACKOFFICE_NAV.filter(item => {
    if (!item.permission) return true;
    if (isAdmin()) return true;
    return hasPermission(item.permission as PermissionName);
  });

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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-600/20 shrink-0">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <span className="text-[15px] font-semibold text-foreground block">Epictète</span>
                <span className="text-[11px] text-muted-foreground block">Backoffice</span>
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
              const isActive = pathname === item.href ||
                              (item.href !== '/admin' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  onClick={onMobileClose}
                  className={`
                    flex items-center gap-3 rounded-lg no-underline transition-all
                    ${isCollapsed ? 'py-2.5 justify-center' : 'py-2.5 px-3'}
                    ${isActive
                      ? 'bg-amber-600/10 text-amber-600'
                      : 'text-muted-foreground hover:bg-card hover:text-foreground'
                    }
                  `}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  {!isCollapsed && (
                    <span className="text-[13px] font-medium">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User */}
        {user && (
          <div className="border-t border-border p-3">
            <div className={`flex items-center gap-3 p-2 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-[13px] font-semibold text-white shrink-0">
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
          </div>
        )}
      </aside>
    </>
  );
}
