'use client';

import { useState, useEffect } from 'react';
import { useAuth, usePermissions } from '@/lib/auth/hooks';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  UtensilsCrossed,
  Users,
  ChefHat,
  Image,
  Plus,
  ArrowUpRight,
  Utensils,
  CircleDollarSign
} from 'lucide-react';
import type { RoleName } from '@/lib/types/auth';

const ROLE_DISPLAY_NAMES: Record<RoleName, string> = {
  admin: 'Administrator',
  finance: 'Finance Manager',
  marketing: 'Marketing',
  regular: 'Staff Member'
};

interface Stats {
  menuItems: number;
  menuCategories: number;
  itemsWithImages: number;
  signatureItems: number;
  availableItems: number;
  users: number;
  activeUsers: number;
}

interface RecentItem {
  id: string;
  name: string;
  name_fr: string;
  price: number;
  updated_at: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [menuItemsRes, categoriesRes, usersRes] = await Promise.all([
          supabase.from('menu_items').select('id, name, name_fr, price, image_url, is_signature, is_available, updated_at').order('updated_at', { ascending: false }),
          supabase.from('menu_categories').select('id'),
          supabase.from('profiles').select('id, is_active')
        ]);

        const menuItems = menuItemsRes.data || [];
        const categories = categoriesRes.data || [];
        const users = usersRes.data || [];

        setStats({
          menuItems: menuItems.length,
          menuCategories: categories.length,
          itemsWithImages: menuItems.filter(i => i.image_url).length,
          signatureItems: menuItems.filter(i => i.is_signature).length,
          availableItems: menuItems.filter(i => i.is_available).length,
          users: users.length,
          activeUsers: users.filter(u => u.is_active).length
        });

        setRecentItems(menuItems.slice(0, 5).map(i => ({
          id: i.id,
          name: i.name,
          name_fr: i.name_fr,
          price: i.price,
          updated_at: i.updated_at
        })));
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const roleName = user?.role ? ROLE_DISPLAY_NAMES[user.role] : 'User';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const imagePercentage = stats && stats.menuItems > 0 ? Math.round((stats.itemsWithImages / stats.menuItems) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with your restaurant today.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{user?.full_name}</p>
            <p className="text-xs text-amber-600">{roleName}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-white font-bold text-lg">
            {user?.full_name?.[0] || 'U'}
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Menu Items */}
        <div className="bg-gradient-to-br from-amber-600/20 to-amber-700/10 border border-amber-600/20 rounded-2xl p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-600/20 flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-sm text-amber-600/80">{stats?.menuCategories} categories</span>
          </div>
          <p className="text-4xl font-bold text-foreground">{stats?.menuItems || 0}</p>
          <p className="text-muted-foreground mt-1">Menu Items</p>
        </div>

        {/* With Images */}
        <div className="bg-secondary border border-border rounded-2xl p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Image className="w-6 h-6 text-blue-500" />
            </div>
            <span className={`text-sm font-medium ${imagePercentage >= 50 ? 'text-green-500' : 'text-amber-500'}`}>
              {imagePercentage}%
            </span>
          </div>
          <p className="text-4xl font-bold text-foreground">{stats?.itemsWithImages || 0}</p>
          <p className="text-muted-foreground mt-1">With Images</p>
          <div className="mt-3 h-1.5 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${imagePercentage}%` }} />
          </div>
        </div>

        {/* Signature */}
        <div className="bg-secondary border border-border rounded-2xl p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-yellow-500" />
            </div>
            <span className="text-yellow-500 text-sm">Featured</span>
          </div>
          <p className="text-4xl font-bold text-foreground">{stats?.signatureItems || 0}</p>
          <p className="text-muted-foreground mt-1">Signature Dishes</p>
        </div>

        {/* Team */}
        <div className="bg-secondary border border-border rounded-2xl p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-500" />
            </div>
            <span className="text-green-500 text-sm">{stats?.activeUsers} active</span>
          </div>
          <p className="text-4xl font-bold text-foreground">{stats?.users || 0}</p>
          <p className="text-muted-foreground mt-1">Team Members</p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-secondary border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-5">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {hasPermission('menu.write') && (
              <Link
                href="/admin/menu"
                className="group flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-amber-600/30 hover:bg-amber-600/5 transition-all no-underline"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-600/10 flex items-center justify-center group-hover:bg-amber-600/20 transition-colors">
                  <Plus className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Add Menu Item</p>
                  <p className="text-sm text-muted-foreground">Create a new dish</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-muted group-hover:text-amber-600 transition-colors" />
              </Link>
            )}

            {hasPermission('users.manage') && (
              <Link
                href="/admin/users"
                className="group flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-blue-500/30 hover:bg-blue-500/5 transition-all no-underline"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Manage Team</p>
                  <p className="text-sm text-muted-foreground">Add or edit users</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-muted group-hover:text-blue-500 transition-colors" />
              </Link>
            )}

            <Link
              href="/admin/menu"
              className="group flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-purple-500/30 hover:bg-purple-500/5 transition-all no-underline"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                <Utensils className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">View Full Menu</p>
                <p className="text-sm text-muted-foreground">Browse all items</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-muted group-hover:text-purple-500 transition-colors" />
            </Link>

            {hasPermission('finance.read') && (
              <Link
                href="/admin/finance"
                className="group flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-green-500/30 hover:bg-green-500/5 transition-all no-underline"
              >
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                  <CircleDollarSign className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Finance Reports</p>
                  <p className="text-sm text-muted-foreground">View analytics</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-muted group-hover:text-green-500 transition-colors" />
              </Link>
            )}
          </div>
        </div>

        {/* Menu Status */}
        <div className="bg-secondary border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-5">Menu Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-card rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Available</span>
              </div>
              <span className="font-semibold text-foreground">{stats?.availableItems || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-card rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-muted-foreground">Unavailable</span>
              </div>
              <span className="font-semibold text-foreground">{(stats?.menuItems || 0) - (stats?.availableItems || 0)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-card rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-muted-foreground">Signature</span>
              </div>
              <span className="font-semibold text-foreground">{stats?.signatureItems || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-card rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Need Images</span>
              </div>
              <span className="font-semibold text-foreground">{(stats?.menuItems || 0) - (stats?.itemsWithImages || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {recentItems.length > 0 && (
        <div className="bg-secondary border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-foreground">Recently Updated Items</h2>
            <Link href="/admin/menu" className="text-sm text-amber-600 hover:text-amber-500 no-underline">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider pb-3 pr-4">Item</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider pb-3 pr-4">English</th>
                  <th className="text-right text-xs font-medium text-muted uppercase tracking-wider pb-3 pr-4">Price</th>
                  <th className="text-right text-xs font-medium text-muted uppercase tracking-wider pb-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentItems.map(item => (
                  <tr key={item.id} className="hover:bg-card transition-colors">
                    <td className="py-3.5 pr-4">
                      <span className="font-medium text-foreground">{item.name_fr}</span>
                    </td>
                    <td className="py-3.5 pr-4 text-muted-foreground">{item.name}</td>
                    <td className="py-3.5 pr-4 text-right">
                      <span className="text-amber-600 font-semibold">{item.price} DH</span>
                    </td>
                    <td className="py-3.5 text-right text-muted text-sm">
                      {new Date(item.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
