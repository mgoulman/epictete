"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Utensils, Loader2 } from "lucide-react";
import { MENU_CATEGORIES, MenuCategory, MenuTag, MenuItem, MenuCategoryInfo } from "@/lib/menu-types";
import { supabase, MenuCategory as DBMenuCategory, MenuItem as DBMenuItem } from "@/lib/supabase";
import { MenuSection, SearchBar, ItemDetailModal } from "./components";
import { getCategoryAvailabilityStatus } from "@/lib/time-availability";

// Lowercase + strip diacritics so "Épictète" and "epictete" match.
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Split into word tokens, case- and accent-insensitive.
function tokenize(s: string): string[] {
  return normalize(s).split(/[^a-z0-9]+/).filter(Boolean);
}

// Italian/French/English synonyms so "pizza" finds "pizze" items, "pates"
// finds "pasta", "salade" finds "salades", etc. Keys are normalized tokens.
const SYNONYMS: Record<string, string[]> = {
  pizza: ['pizze', 'pizzas'],
  pizze: ['pizza', 'pizzas'],
  pizzas: ['pizza', 'pizze'],
  pasta: ['paste', 'pates', 'pate'],
  paste: ['pasta', 'pates', 'pate'],
  pates: ['pasta', 'paste', 'pate'],
  pate: ['pasta', 'paste', 'pates'],
  antipasto: ['antipasti', 'entree', 'entrees', 'starter', 'appetizer'],
  antipasti: ['antipasto', 'entree', 'entrees', 'starter', 'appetizer'],
  dolce: ['dolci', 'dessert', 'desserts'],
  dolci: ['dolce', 'dessert', 'desserts'],
  dessert: ['dolce', 'dolci', 'desserts'],
  secondo: ['secondi', 'plat', 'plats', 'main'],
  secondi: ['secondo', 'plat', 'plats', 'main'],
  boisson: ['boissons', 'drink', 'drinks', 'beverages', 'beverage'],
  boissons: ['boisson', 'drink', 'drinks', 'beverages', 'beverage'],
  jus: ['juice', 'juices'],
  vin: ['vins', 'wine', 'wines'],
  cafe: ['coffee', 'cafes'],
  the: ['tea', 'teas', 'thes'],
  salade: ['salades', 'salad', 'salads', 'insalata', 'insalate'],
  salades: ['salade', 'salad', 'salads', 'insalata', 'insalate'],
  poulet: ['chicken', 'pollo'],
  poisson: ['fish', 'pesce'],
  poissons: ['fish', 'pesce'],
  viande: ['meat', 'carne'],
  fromage: ['cheese', 'formaggio', 'formaggi'],
  fromages: ['cheese', 'formaggio', 'formaggi'],
};

// A query token matches the searchable blob if any of:
//  - it (or a synonym) is a substring of the blob, OR
//  - a token in the blob shares a long common prefix with it (handles
//    typos / minor plural variants like "pizza" ~ "pizze").
function matchToken(qt: string, blob: string): boolean {
  const variants = [qt, ...(SYNONYMS[qt] || [])];
  for (const v of variants) {
    if (blob.includes(v)) return true;
  }
  if (qt.length >= 4) {
    const prefix = qt.slice(0, Math.max(4, qt.length - 1));
    for (const word of blob.split(/[^a-z0-9]+/)) {
      if (word.length >= 4 && word.startsWith(prefix)) return true;
    }
  }
  return false;
}

// `ingredients` is stored as a JSON-formatted text column in the DB, not as
// a Postgres array — so it arrives at the client as a string. Parse defensively
// in case the value is null, a real array, or a malformed string.
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// Transform DB item to frontend MenuItem format
function transformDBItem(dbItem: DBMenuItem): MenuItem {
  const ingredientsEn = toStringArray(dbItem.ingredients_en);
  return {
    id: dbItem.id,
    name: dbItem.name,
    nameFr: dbItem.name_fr,
    price: dbItem.price,
    priceSmall: dbItem.price_small || undefined,
    priceLarge: dbItem.price_large || undefined,
    description: dbItem.description || '',
    descriptionEn: dbItem.description_en || undefined,
    ingredients: toStringArray(dbItem.ingredients),
    ingredientsEn: ingredientsEn.length > 0 ? ingredientsEn : undefined,
    category: dbItem.category_id as MenuCategory,
    extraCategories: toStringArray(dbItem.extra_category_ids),
    tags: toStringArray(dbItem.tags) as MenuTag[],
    isSignature: dbItem.is_signature || false,
    chefNote: dbItem.chef_note || undefined,
    image: dbItem.image_url || undefined,
  };
}

export function DigitalMenuClient() {
  const [, setActiveCategory] = useState<MenuCategory | null>("antipasti");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags] = useState<MenuTag[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dbCategories, setDbCategories] = useState<DBMenuCategory[]>([]);
  const [dbMenuItems, setDbMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch categories and items from Supabase
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      
      const [categoriesRes, itemsRes] = await Promise.all([
        supabase
          .from('menu_categories')
          .select('*')
          .order('sort_order'),
        supabase
          .from('menu_items')
          .select('*')
          .eq('is_available', true)
          .order('sort_order')
      ]);
      
      if (categoriesRes.data && !categoriesRes.error) {
        setDbCategories(categoriesRes.data);
      }
      
      if (itemsRes.data && !itemsRes.error) {
        setDbMenuItems(itemsRes.data.map(transformDBItem));
      }
      
      setIsLoading(false);
    }
    fetchData();
  }, []);

  // Merge DB categories with static fallback (exclude brunch-extras from main list)
  // Reorder: move unavailable time-based categories (brunch/breakfast) to bottom
  const categories: MenuCategoryInfo[] = useMemo(() => {
    if (dbCategories.length === 0) return MENU_CATEGORIES;
    
    const timeBasedCategoryIds = ['brunch', 'breakfast'];
    
    const mapped = dbCategories
      .filter(dbCat => dbCat.id !== 'brunch-extras') // Hide extras from nav
      .map(dbCat => ({
        id: dbCat.id as MenuCategory,
        name: dbCat.name,
        nameFr: dbCat.name_fr,
        icon: dbCat.icon || '🍽️',
        description: dbCat.description || undefined,
        _dbCategory: dbCat, // Keep reference for availability check
      }));
    
    // Separate available and unavailable time-based categories
    const availableCategories: typeof mapped = [];
    const unavailableTimeBasedCategories: typeof mapped = [];
    
    mapped.forEach(cat => {
      const isTimeBased = timeBasedCategoryIds.includes(cat.id);
      if (isTimeBased) {
        // Check availability using the DB category
        const availability = getCategoryAvailabilityStatus(cat._dbCategory);
        if (availability.isAvailable) {
          availableCategories.push(cat);
        } else {
          unavailableTimeBasedCategories.push(cat);
        }
      } else {
        availableCategories.push(cat);
      }
    });
    
    // Return available first, then unavailable time-based at bottom
    return [...availableCategories, ...unavailableTimeBasedCategories].map(({ _dbCategory, ...rest }) => rest);
  }, [dbCategories]);

  // Filter items based on search and tags
  const filteredItems = useMemo(() => {
    let items = dbMenuItems;

    // Search filter — smart, accent-insensitive, token-based, synonym-aware.
    if (searchQuery.trim()) {
      // Build a category id → display name map so the search can match by
      // category (e.g. typing "pizza" should surface every item whose
      // category is "pizze").
      const categoryNameById = new Map<string, string>();
      for (const c of dbCategories) {
        categoryNameById.set(c.id, `${c.name} ${c.name_fr || ''}`);
      }

      const queryTokens = tokenize(searchQuery);
      items = items.filter((item) => {
        const parts: string[] = [
          item.name,
          item.nameFr,
          item.description,
          ...item.ingredients,
          ...item.tags,
          categoryNameById.get(item.category) || '',
          ...(item.extraCategories || []).map((id) => categoryNameById.get(id) || ''),
        ];
        if (item.descriptionEn) parts.push(item.descriptionEn);
        if (item.ingredientsEn) parts.push(...item.ingredientsEn);
        const blob = parts.filter(Boolean).map(normalize).join(' ');
        return queryTokens.every((qt) => matchToken(qt, blob));
      });
    }

    // Tag filter
    if (activeTags.length > 0) {
      items = items.filter((item) =>
        activeTags.some((tag) => item.tags.includes(tag))
      );
    }

    return items;
  }, [dbMenuItems, dbCategories, searchQuery, activeTags]);

  // Returns true if item belongs to the given category (primary or extra).
  const itemIsInCategory = useCallback((item: MenuItem, categoryId: string) => {
    if (item.category === categoryId) return true;
    return (item.extraCategories || []).includes(categoryId);
  }, []);

  // Get brunch extras items separately (to display within brunch section)
  const brunchExtrasItems = useMemo(() => {
    return filteredItems.filter(item => itemIsInCategory(item, 'brunch-extras'));
  }, [filteredItems, itemIsInCategory]);

  // Group filtered items by category (exclude brunch-extras as they go in brunch section)
  const itemsByCategory = useMemo(() => {
    const grouped = new Map<MenuCategory, MenuItem[]>();

    categories.forEach((cat) => {
      const categoryItems = filteredItems.filter((item) => itemIsInCategory(item, cat.id));
      if (categoryItems.length > 0) {
        grouped.set(cat.id, categoryItems);
      }
    });

    return grouped;
  }, [filteredItems, categories, itemIsInCategory]);

  // Handle category in view (from intersection observer)
  const handleCategoryInView = useCallback((categoryId: string) => {
    setActiveCategory(categoryId as MenuCategory);
  }, []);

  // Handle item click - open modal
  const handleItemClick = useCallback((item: MenuItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  }, []);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedItem(null), 200);
  }, []);

  const totalItems = filteredItems.length;

  return (
    <div className="min-h-screen bg-primary">
      {/* Hero Header */}
      <section className="relative pt-28 pb-12 md:pt-36 md:pb-16 overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-linear-to-b from-secondary via-secondary/80 to-primary" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,169,98,0.15)_0%,transparent_50%)]" />
                
        <div className="relative max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Decorative line */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-12 bg-linear-to-r from-transparent to-accent/50" />
              <Utensils className="w-6 h-6 text-accent" />
              <div className="h-px w-12 bg-linear-to-l from-transparent to-accent/50" />
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-semibold text-foreground tracking-tight">
              Notre Carte
            </h1>
            <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Une cuisine italienne authentique, des ingrédients frais de notre ferme biologique
            </p>
          </motion.div>

          {/* Search & Filters Container */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 max-w-2xl mx-auto"
          >
            {/* Search Bar */}
            <div className="relative">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Rechercher un plat..."
              />
            </div>

            {/* Results count */}
            {searchQuery && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 text-center text-sm text-muted-foreground"
              >
                {totalItems} {totalItems === 1 ? "résultat" : "résultats"}
              </motion.p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Menu Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-accent animate-spin" />
            <p className="mt-4 text-muted-foreground">Chargement du menu...</p>
          </div>
        ) : itemsByCategory.size === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <p className="text-xl text-muted-foreground">
              Aucun plat ne correspond à votre recherche.
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 text-accent hover:text-accent-hover underline"
            >
              Effacer la recherche
            </button>
          </motion.div>
        ) : (
          <div className="space-y-16">
            {categories.map((category) => {
              const items = itemsByCategory.get(category.id);
              if (!items) return null;
              
              // Find the corresponding DB category for availability info
              const dbCategory = dbCategories.find(c => c.id === category.id);
              
              // Pass extras to brunch section
              const extras = category.id === 'brunch' ? brunchExtrasItems : undefined;
              
              return (
                <MenuSection
                  key={category.id}
                  category={category}
                  dbCategory={dbCategory}
                  items={items}
                  extrasItems={extras}
                  onInView={handleCategoryInView}
                  onItemClick={handleItemClick}
                />
              );
            })}
          </div>
        )}
      </main>


      {/* Item Detail Modal */}
      <ItemDetailModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />
    </div>
  );
}
