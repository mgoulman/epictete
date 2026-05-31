'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import { PermissionGate } from '@/components/backoffice/auth/PermissionGate';
import type { MenuItem, MenuCategory } from '@/lib/supabase';
import type { SectionName, SiteContentRow, TestimonialItem } from '@/lib/types/site-content';
import { SECTION_FIELDS } from '@/lib/types/site-content';
import {
  FileText, Flame, Search, Image, Check, X, Loader2, Eye,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { BilingualField, SectionEditorWrapper } from '@/components/backoffice/marketing/SectionEditor';
import { TestimonialsEditor } from '@/components/backoffice/marketing/TestimonialsEditor';

type TabName = SectionName | 'dishes';

const TAB_ORDER: TabName[] = ['hero', 'philosophy', 'gallery', 'featuredDishes', 'testimonials', 'location', 'cta', 'dishes'];

function TextFieldsEditor({
  section,
  row,
  onSaved,
  fields,
  multilineFields = [],
}: {
  section: SectionName;
  row: SiteContentRow | undefined;
  onSaved: () => void;
  fields: string[];
  multilineFields?: string[];
}) {
  const { t } = useTranslation();
  const fieldLabels = t.backoffice.marketing.fields;

  return (
    <SectionEditorWrapper section={section} row={row} onSaved={onSaved}>
      {({ frData, enData, setFrField, setEnField }) => (
        <div className="space-y-5">
          {fields.map((field) => (
            <BilingualField
              key={field}
              label={(fieldLabels as Record<string, string>)[field] || field}
              fieldKey={field}
              frValue={frData[field] || ''}
              enValue={enData[field] || ''}
              onChangeFr={setFrField}
              onChangeEn={setEnField}
              multiline={multilineFields.includes(field)}
            />
          ))}
        </div>
      )}
    </SectionEditorWrapper>
  );
}

function TestimonialsTabEditor({
  row,
  onSaved,
}: {
  row: SiteContentRow | undefined;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const fieldLabels = t.backoffice.marketing.fields;

  return (
    <SectionEditorWrapper section="testimonials" row={row} onSaved={onSaved}>
      {({ frData, enData, setFrField, setEnField, fullContent, setFullContent }) => {
        const frReviews = ((fullContent.fr as Record<string, unknown>)?.reviews || []) as TestimonialItem[];
        const enReviews = ((fullContent.en as Record<string, unknown>)?.reviews || []) as TestimonialItem[];

        const setFrReviews = (reviews: TestimonialItem[]) => {
          setFullContent(prev => ({
            ...prev,
            fr: { ...(prev.fr as Record<string, unknown> || {}), reviews },
          }));
        };

        const setEnReviews = (reviews: TestimonialItem[]) => {
          setFullContent(prev => ({
            ...prev,
            en: { ...(prev.en as Record<string, unknown> || {}), reviews },
          }));
        };

        return (
          <div className="space-y-6">
            {/* Text fields (eyebrow, title, description, followInstagram) */}
            {SECTION_FIELDS.testimonials.map((field) => (
              <BilingualField
                key={field}
                label={(fieldLabels as Record<string, string>)[field] || field}
                fieldKey={field}
                frValue={frData[field] || ''}
                enValue={enData[field] || ''}
                onChangeFr={setFrField}
                onChangeEn={setEnField}
                multiline={field === 'description'}
              />
            ))}

            {/* Reviews editors side-by-side */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                {t.backoffice.marketing.testimonials.reviewContent}
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TestimonialsEditor locale="fr" reviews={frReviews} onChange={setFrReviews} />
                <TestimonialsEditor locale="en" reviews={enReviews} onChange={setEnReviews} />
              </div>
            </div>
          </div>
        );
      }}
    </SectionEditorWrapper>
  );
}

function FeaturedDishesTab() {
  const { t } = useTranslation();
  const m = t.backoffice.marketing;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#606338] animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{m.featuredDishes}</h2>
            <p className="text-xs text-muted-foreground">{m.featuredSubtitle}</p>
          </div>
        </div>
        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${isAtLimit ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
          {featuredItems.length}/{MAX_FEATURED}
        </span>
      </div>

      {/* Currently Featured */}
      {featuredItems.length > 0 && (
        <div className="mb-4 p-4 bg-orange-500/[0.03] rounded-xl border border-orange-500/10">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">{m.currentlyOnLanding}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {featuredItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-card border border-orange-500/20 rounded-xl">
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
                  title={m.removeFromLanding}
                >
                  {togglingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search + Category Filter */}
      <div className="flex gap-3 items-center flex-wrap mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={m.searchDishes}
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
          {m.all}
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
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
              item.is_featured ? 'bg-orange-500 border-orange-500' : 'border-border'
            }`}>
              {togglingId === item.id ? (
                <Loader2 className="w-3 h-3 text-white animate-spin" />
              ) : item.is_featured ? (
                <Check className="w-3 h-3 text-white" />
              ) : null}
            </div>
            <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden shrink-0 flex items-center justify-center">
              {item.image_url ? (
                <img src={item.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Image className="w-4 h-4 text-muted" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground truncate">{item.name_fr}</p>
                {!item.is_available && (
                  <span className="px-1.5 py-0.5 bg-red-500/15 text-red-500 text-[10px] font-medium rounded">{m.unavailable}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{getCategoryIcon(item.category_id)} {getCategoryName(item.category_id)}</p>
            </div>
            <span className="text-sm font-semibold text-[#606338] shrink-0">{item.price} DH</span>
          </button>
        ))}
        {filteredItems.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">{m.noItemsMatch}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MarketingPage() {
  const { t } = useTranslation();
  const m = t.backoffice.marketing;

  const [activeTab, setActiveTab] = useState<TabName>('hero');
  const [siteContent, setSiteContent] = useState<SiteContentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSiteContent = useCallback(async () => {
    try {
      const res = await fetch('/api/site-content');
      const json = await res.json();
      setSiteContent(json.data || []);
    } catch (err) {
      console.error('Failed to load site content:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSiteContent(); }, [loadSiteContent]);

  const getRow = (section: SectionName) => siteContent.find(r => r.section === section);

  const tabLabels: Record<TabName, string> = {
    hero: m.tabs.hero,
    philosophy: m.tabs.philosophy,
    gallery: m.tabs.gallery,
    featuredDishes: m.tabs.featuredDishes,
    testimonials: m.tabs.testimonials,
    location: m.tabs.location,
    cta: m.tabs.cta,
    dishes: m.featuredDishes,
  };

  return (
    <PermissionGate
      permission="marketing.read"
      fallback={
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground">{t.backoffice.shared.noPermission}</p>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{m.title}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{m.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg text-foreground text-sm font-medium no-underline hover:bg-secondary transition-colors"
            >
              <Eye className="w-4 h-4" />
              {m.previewSite}
            </Link>
            <Link
              href="/admin/docs"
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-[#606338] to-[#4d4f2e] rounded-lg text-white text-sm font-medium no-underline"
            >
              <FileText className="w-4 h-4" />
              {m.viewDocs}
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide border-b border-border">
          {TAB_ORDER.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-[1px] ${
                activeTab === tab
                  ? 'border-[#606338] text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-secondary border border-border rounded-xl p-5 sm:p-6">
          {loading && activeTab !== 'dishes' ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#606338] animate-spin" />
            </div>
          ) : (
            <>
              {activeTab === 'hero' && (
                <TextFieldsEditor
                  section="hero"
                  row={getRow('hero')}
                  onSaved={loadSiteContent}
                  fields={SECTION_FIELDS.hero}
                  multilineFields={['description']}
                />
              )}
              {activeTab === 'philosophy' && (
                <TextFieldsEditor
                  section="philosophy"
                  row={getRow('philosophy')}
                  onSaved={loadSiteContent}
                  fields={SECTION_FIELDS.philosophy}
                  multilineFields={['description', 'organicDesc', 'woodFiredDesc', 'homemadeDesc']}
                />
              )}
              {activeTab === 'gallery' && (
                <TextFieldsEditor
                  section="gallery"
                  row={getRow('gallery')}
                  onSaved={loadSiteContent}
                  fields={SECTION_FIELDS.gallery}
                  multilineFields={['description']}
                />
              )}
              {activeTab === 'featuredDishes' && (
                <TextFieldsEditor
                  section="featuredDishes"
                  row={getRow('featuredDishes')}
                  onSaved={loadSiteContent}
                  fields={SECTION_FIELDS.featuredDishes}
                  multilineFields={['description']}
                />
              )}
              {activeTab === 'testimonials' && (
                <TestimonialsTabEditor
                  row={getRow('testimonials')}
                  onSaved={loadSiteContent}
                />
              )}
              {activeTab === 'location' && (
                <TextFieldsEditor
                  section="location"
                  row={getRow('location')}
                  onSaved={loadSiteContent}
                  fields={SECTION_FIELDS.location}
                  multilineFields={['description']}
                />
              )}
              {activeTab === 'cta' && (
                <TextFieldsEditor
                  section="cta"
                  row={getRow('cta')}
                  onSaved={loadSiteContent}
                  fields={SECTION_FIELDS.cta}
                  multilineFields={['description']}
                />
              )}
              {activeTab === 'dishes' && <FeaturedDishesTab />}
            </>
          )}
        </div>
      </div>
    </PermissionGate>
  );
}
