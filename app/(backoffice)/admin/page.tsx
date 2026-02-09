'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/lib/auth/hooks';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  UtensilsCrossed,
  Users,
  ChefHat,
  Plus,
  ArrowUpRight,
  Utensils,
  CircleDollarSign,
  UserCog,
  Clock,
  Package,
  CreditCard,
  TrendingUp,
  CalendarDays
} from 'lucide-react';


interface Stats {
  menuItems: number;
  menuCategories: number;
  signatureItems: number;
  availableItems: number;
  users: number;
  activeUsers: number;
  // Personnel stats
  staffCount: number;
  activeStaff: number;
  pendingTimeOff: number;
  // Vendor stats
  vendorCount: number;
  totalOwedToVendors: number;
  // Inventory stats
  inventoryItems: number;
  lowStockItems: number;
}

interface RecentItem {
  id: string;
  name: string;
  name_fr: string;
  price: number;
  updated_at: string;
}

export default function AdminDashboard() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const d = t.backoffice.dashboard;
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all data in parallel
        const [
          menuItemsRes,
          categoriesRes,
          usersRes,
          staffRes,
          timeOffRes,
          vendorsRes,
          inventoryRes
        ] = await Promise.all([
          supabase.from('menu_items').select('id, name, name_fr, price, image_url, is_signature, is_available, updated_at').order('updated_at', { ascending: false }),
          supabase.from('menu_categories').select('id'),
          supabase.from('profiles').select('id, is_active'),
          supabase.from('staff_members').select('id, is_active'),
          supabase.from('time_off').select('id, status').eq('status', 'pending'),
          supabase.from('vendors').select('id'),
          supabase.from('inventory_items').select('id, quantity, minimum_stock')
        ]);

        const menuItems = menuItemsRes.data || [];
        const categories = categoriesRes.data || [];
        const users = usersRes.data || [];
        const staff = staffRes.data || [];
        const pendingTimeOff = timeOffRes.data || [];
        const vendors = vendorsRes.data || [];
        const inventory = inventoryRes.data || [];

        // Calculate vendor balances
        let totalOwed = 0;
        if (vendors.length > 0) {
          const { data: transactions } = await supabase
            .from('vendor_transactions')
            .select('vendor_id, type, amount');

          if (transactions) {
            const balances: Record<string, number> = {};
            transactions.forEach(t => {
              if (!balances[t.vendor_id]) balances[t.vendor_id] = 0;
              if (t.type === 'debt') balances[t.vendor_id] += Number(t.amount);
              if (t.type === 'payment') balances[t.vendor_id] -= Number(t.amount);
            });
            totalOwed = Object.values(balances).reduce((sum, b) => sum + Math.max(0, b), 0);
          }
        }

        // Count low stock items
        const lowStockCount = inventory.filter(i => i.quantity <= i.minimum_stock && i.minimum_stock > 0).length;

        setStats({
          menuItems: menuItems.length,
          menuCategories: categories.length,
          signatureItems: menuItems.filter(i => i.is_signature).length,
          availableItems: menuItems.filter(i => i.is_available).length,
          users: users.length,
          activeUsers: users.filter(u => u.is_active).length,
          staffCount: staff.length,
          activeStaff: staff.filter(s => s.is_active).length,
          pendingTimeOff: pendingTimeOff.length,
          vendorCount: vendors.length,
          totalOwedToVendors: totalOwed,
          inventoryItems: inventory.length,
          lowStockItems: lowStockCount
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#606338] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-MA', { style: 'decimal', minimumFractionDigits: 2 }).format(value) + ' DH';
  };

  return (
    <div className="space-y-8">
      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Menu Items */}
        <div className="bg-gradient-to-br from-[#606338]/20 to-[#4d4f2e]/10 border border-[#606338]/20 rounded-2xl p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#606338]/20 flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 text-[#606338]" />
            </div>
            <span className="text-sm text-[#606338]/80">{stats?.menuCategories} {d.categories}</span>
          </div>
          <p className="text-4xl font-bold text-foreground">{stats?.menuItems || 0}</p>
          <p className="text-muted-foreground mt-1">{d.menuItems}</p>
        </div>

        {/* Staff */}
        <div className="bg-secondary border border-border rounded-2xl p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <UserCog className="w-6 h-6 text-purple-500" />
            </div>
            <span className="text-purple-500 text-sm">{stats?.activeStaff} {d.active}</span>
          </div>
          <p className="text-4xl font-bold text-foreground">{stats?.staffCount || 0}</p>
          <p className="text-muted-foreground mt-1">{d.staffMembers}</p>
        </div>

        {/* Vendors Owed */}
        <div className={`border rounded-2xl p-5 lg:p-6 ${(stats?.totalOwedToVendors || 0) > 0 ? 'bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/20' : 'bg-secondary border-border'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${(stats?.totalOwedToVendors || 0) > 0 ? 'bg-red-500/20' : 'bg-green-500/10'}`}>
              <CreditCard className={`w-6 h-6 ${(stats?.totalOwedToVendors || 0) > 0 ? 'text-red-500' : 'text-green-500'}`} />
            </div>
            <span className={`text-sm ${(stats?.totalOwedToVendors || 0) > 0 ? 'text-red-400' : 'text-green-500'}`}>
              {stats?.vendorCount} {d.vendors}
            </span>
          </div>
          <p className={`text-3xl font-bold ${(stats?.totalOwedToVendors || 0) > 0 ? 'text-red-500' : 'text-foreground'}`}>
            {formatCurrency(stats?.totalOwedToVendors || 0)}
          </p>
          <p className="text-muted-foreground mt-1">{d.owedToVendors}</p>
        </div>

        {/* Team */}
        <div className="bg-secondary border border-border rounded-2xl p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-500" />
            </div>
            <span className="text-green-500 text-sm">{stats?.activeUsers} {d.active}</span>
          </div>
          <p className="text-4xl font-bold text-foreground">{stats?.users || 0}</p>
          <p className="text-muted-foreground mt-1">{d.systemUsers}</p>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Signature Dishes */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats?.signatureItems || 0}</p>
              <p className="text-xs text-muted-foreground">{d.signatureDishes}</p>
            </div>
          </div>
        </div>

        {/* Pending Time Off */}
        <div className={`border rounded-xl p-4 ${(stats?.pendingTimeOff || 0) > 0 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-card border-border'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${(stats?.pendingTimeOff || 0) > 0 ? 'bg-yellow-500/20' : 'bg-blue-500/10'}`}>
              <CalendarDays className={`w-5 h-5 ${(stats?.pendingTimeOff || 0) > 0 ? 'text-yellow-500' : 'text-blue-500'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${(stats?.pendingTimeOff || 0) > 0 ? 'text-yellow-500' : 'text-foreground'}`}>
                {stats?.pendingTimeOff || 0}
              </p>
              <p className="text-xs text-muted-foreground">{d.pendingTimeOff}</p>
            </div>
          </div>
        </div>

        {/* Inventory Items */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#606338]/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-[#606338]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats?.inventoryItems || 0}</p>
              <p className="text-xs text-muted-foreground">{d.inventoryItems}</p>
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className={`border rounded-xl p-4 ${(stats?.lowStockItems || 0) > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-card border-border'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${(stats?.lowStockItems || 0) > 0 ? 'bg-red-500/20' : 'bg-green-500/10'}`}>
              <TrendingUp className={`w-5 h-5 ${(stats?.lowStockItems || 0) > 0 ? 'text-red-500' : 'text-green-500'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${(stats?.lowStockItems || 0) > 0 ? 'text-red-500' : 'text-foreground'}`}>
                {stats?.lowStockItems || 0}
              </p>
              <p className="text-xs text-muted-foreground">{d.lowStockItems}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-secondary border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-5">{d.quickActions}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {hasPermission('menu.write') && (
              <Link
                href="/admin/menu"
                className="group flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-[#606338]/30 hover:bg-[#606338]/5 transition-all no-underline"
              >
                <div className="w-12 h-12 rounded-xl bg-[#606338]/10 flex items-center justify-center group-hover:bg-[#606338]/20 transition-colors">
                  <Plus className="w-5 h-5 text-[#606338]" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{d.addMenuItem}</p>
                  <p className="text-sm text-muted-foreground">{d.createNewDish}</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-muted group-hover:text-[#606338] transition-colors" />
              </Link>
            )}

            {hasPermission('users.manage') && (
              <Link
                href="/admin/personnel"
                className="group flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-purple-500/30 hover:bg-purple-500/5 transition-all no-underline"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <UserCog className="w-5 h-5 text-purple-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{d.managePersonnel}</p>
                  <p className="text-sm text-muted-foreground">{d.staffSchedules}</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-muted group-hover:text-purple-500 transition-colors" />
              </Link>
            )}

            {hasPermission('finance.read') && (
              <Link
                href="/admin/finance"
                className="group flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-green-500/30 hover:bg-green-500/5 transition-all no-underline"
              >
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                  <CircleDollarSign className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{d.financeVendors}</p>
                  <p className="text-sm text-muted-foreground">{d.reportsPayments}</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-muted group-hover:text-green-500 transition-colors" />
              </Link>
            )}

            <Link
              href="/admin/menu"
              className="group flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-[#7A7B4E]/30 hover:bg-[#7A7B4E]/5 transition-all no-underline"
            >
              <div className="w-12 h-12 rounded-xl bg-[#7A7B4E]/10 flex items-center justify-center group-hover:bg-[#7A7B4E]/20 transition-colors">
                <Utensils className="w-5 h-5 text-[#7A7B4E]" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{d.viewFullMenu}</p>
                <p className="text-sm text-muted-foreground">{d.browseAllItems}</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-muted group-hover:text-[#7A7B4E] transition-colors" />
            </Link>
          </div>
        </div>

        {/* Menu Status */}
        <div className="bg-secondary border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-5">{d.menuStatus}</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-card rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">{d.available}</span>
              </div>
              <span className="font-semibold text-foreground">{stats?.availableItems || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-card rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-muted-foreground">{d.unavailable}</span>
              </div>
              <span className="font-semibold text-foreground">{(stats?.menuItems || 0) - (stats?.availableItems || 0)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-card rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-muted-foreground">{d.signature}</span>
              </div>
              <span className="font-semibold text-foreground">{stats?.signatureItems || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-card rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#606338]" />
                <span className="text-muted-foreground">{d.categories}</span>
              </div>
              <span className="font-semibold text-foreground">{stats?.menuCategories || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {recentItems.length > 0 && (
        <div className="bg-secondary border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-foreground">{d.recentlyUpdated}</h2>
            <Link href="/admin/menu" className="text-sm text-[#606338] hover:text-[#7A7B4E] no-underline">
              {d.viewAll}
            </Link>
          </div>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider pb-3 pr-4">{d.item}</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider pb-3 pr-4">{d.english}</th>
                  <th className="text-right text-xs font-medium text-muted uppercase tracking-wider pb-3 pr-4">{d.price}</th>
                  <th className="text-right text-xs font-medium text-muted uppercase tracking-wider pb-3">{d.updated}</th>
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
                      <span className="text-[#606338] font-semibold">{item.price} DH</span>
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
