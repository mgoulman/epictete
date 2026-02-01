'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import { PermissionGate } from '@/components/backoffice/auth/PermissionGate';
import type { MenuItem, MenuCategory } from '@/lib/supabase';
import {
  FileText, Flame, Search, Image, GripVertical,
  Check, X, Loader2, Eye
} from 'lucide-react';

export default function MarketingPage() {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [itemsRes, catRes] = await Promise.all([
      supabase.from('menu_items').select('*').order('sort_order'),
      supabase.from('menu_categories').select('*').order('sort_order'),
    ]);
    if (itemsRes.data) setMenuItems(itemsRes.data);
    if (catRes.data) setCategories(catRes.data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const MAX_FEATURED = 4;

  const featuredItems = menuItems.filter(i => i.is_featured);
  const isAtLimit = featuredItems.length >= MAX_FEATURED;

  const toggleFeatured = async (item: MenuItem) => {
    const newValue = !item.is_featured;
    if (newValue && isAtLimit) return;
    setTogglingId(item.id);
    const { error } = await supabase
      .from('menu_items')
      .update({ is_featured: newValue, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    if (!error) {
      setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, is_featured: newValue } : i));
    }
    setTogglingId(null);
  };
  const getCategoryName = (id: string | null) => id ? categories.find(c => c.id === id)?.name_fr || 'Unknown' : 'Non classé';
  const getCategoryIcon = (id: string | null) => id ? categories.find(c => c.id === id)?.icon || '🍽️' : '📦';

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name_fr.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <PermissionGate
      permission="marketing.read"
      fallback={
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground">You do not have permission to access this page.</p>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Marketing</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage your landing page content</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg text-foreground text-sm font-medium no-underline hover:bg-secondary transition-colors"
            >
              <Eye className="w-4 h-4" />
              Preview Site
            </Link>
            <Link
              href="/admin/docs"
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-[#606338] to-[#4d4f2e] rounded-lg text-white text-sm font-medium no-underline"
            >
              <FileText className="w-4 h-4" />
              View Docs
            </Link>
          </div>
        </div>

        {/* Featured Dishes Section */}
        <div className="bg-secondary border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Featured Dishes</h2>
                <p className="text-xs text-muted-foreground">Select which dishes appear on the landing page</p>
              </div>
            </div>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${isAtLimit ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
              {featuredItems.length}/{MAX_FEATURED}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#606338] animate-spin" />
            </div>
          ) : (
            <>
              {/* Currently Featured */}
              {featuredItems.length > 0 && (
                <div className="px-5 py-4 border-b border-border bg-orange-500/[0.03]">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Currently on Landing Page</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {featuredItems.map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-card border border-orange-500/20 rounded-xl group">
                        <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden shrink-0 flex items-center justify-center">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Image className="w-4 h-4 text-muted" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.name_fr}</p>
                          <p className="text-xs text-muted-foreground truncate">{getCategoryIcon(item.category_id)} {getCategoryName(item.category_id)}</p>
                        </div>
                        <button
                          onClick={() => toggleFeatured(item)}
                          disabled={togglingId === item.id}
                          className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                          title="Remove from landing page"
                        >
                          {togglingId === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Items Picker */}
              <div className="px-5 py-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">All Menu Items</p>

                {/* Search + Category Filter */}
                <div className="flex gap-3 items-center flex-wrap mb-4">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search dishes..."
                      className="w-full py-2.5 pl-10 pr-3 bg-card border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/40"
                    />
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                      !selectedCategory
                        ? 'bg-[#606338] border-[#606338] text-white'
                        : 'bg-card border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                        selectedCategory === cat.id
                          ? 'bg-[#606338] border-[#606338] text-white'
                          : 'bg-card border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span>{cat.icon}</span>{cat.name_fr}
                    </button>
                  ))}
                </div>

                {/* Items List */}
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {filteredItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => toggleFeatured(item)}
                      disabled={togglingId === item.id || (!item.is_featured && isAtLimit)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                        item.is_featured
                          ? 'bg-orange-500/10 border border-orange-500/20'
                          : (!item.is_featured && isAtLimit)
                            ? 'bg-card border border-transparent opacity-40 cursor-not-allowed'
                            : 'bg-card border border-transparent hover:border-border hover:bg-secondary'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                        item.is_featured
                          ? 'bg-orange-500 border-orange-500'
                          : 'border-border'
                      }`}>
                        {togglingId === item.id ? (
                          <Loader2 className="w-3 h-3 text-white animate-spin" />
                        ) : item.is_featured ? (
                          <Check className="w-3 h-3 text-white" />
                        ) : null}
                      </div>

                      {/* Image */}
                      <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden shrink-0 flex items-center justify-center">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Image className="w-4 h-4 text-muted" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{item.name_fr}</p>
                          {!item.is_available && (
                            <span className="px-1.5 py-0.5 bg-red-500/15 text-red-500 text-[10px] font-medium rounded">Unavailable</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{getCategoryIcon(item.category_id)} {getCategoryName(item.category_id)}</p>
                      </div>

                      {/* Price */}
                      <span className="text-sm font-semibold text-[#606338] shrink-0">{item.price} DH</span>
                    </button>
                  ))}

                  {filteredItems.length === 0 && (
                    <div className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">No items match your search</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </PermissionGate>
  );
}
