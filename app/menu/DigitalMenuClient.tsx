"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Utensils } from "lucide-react";
import { menuItems } from "@/lib/menu-data";
import { MENU_CATEGORIES, MenuCategory, MenuTag, MenuItem } from "@/lib/menu-types";
import { CategoryNav, MenuSection, SearchBar, MenuFilters, ItemDetailModal } from "./components";

export function DigitalMenuClient() {
  const [activeCategory, setActiveCategory] = useState<MenuCategory | null>("antipasti");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState<MenuTag[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter items based on search and tags
  const filteredItems = useMemo(() => {
    let items = menuItems;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.ingredients.some((ing) => ing.toLowerCase().includes(query))
      );
    }

    // Tag filter
    if (activeTags.length > 0) {
      items = items.filter((item) =>
        activeTags.some((tag) => item.tags.includes(tag))
      );
    }

    return items;
  }, [searchQuery, activeTags]);

  // Group filtered items by category
  const itemsByCategory = useMemo(() => {
    const grouped = new Map<MenuCategory, typeof menuItems>();
    
    MENU_CATEGORIES.forEach((cat) => {
      const categoryItems = filteredItems.filter((item) => item.category === cat.id);
      if (categoryItems.length > 0) {
        grouped.set(cat.id, categoryItems);
      }
    });

    return grouped;
  }, [filteredItems]);

  // Handle category click - scroll to section
  const handleCategoryClick = useCallback((category: MenuCategory) => {
    setActiveCategory(category);
    const element = document.getElementById(`category-${category}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Handle tag toggle
  const handleTagToggle = useCallback((tag: MenuTag) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  // Handle category in view (from intersection observer)
  const handleCategoryInView = useCallback((categoryId: string) => {
    setActiveCategory(categoryId as MenuCategory);
  }, []);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setActiveTags([]);
    setSearchQuery("");
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
  const isFiltered = searchQuery.trim() || activeTags.length > 0;

  return (
    <div className="min-h-screen bg-primary">
      {/* Hero Header */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-secondary to-primary" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,169,98,0.1)_0%,transparent_60%)]" />
        
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 border border-accent/30 mb-6">
              <Utensils className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-semibold text-foreground">
              Notre Carte
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Découvrez notre sélection de plats italiens authentiques, préparés avec des ingrédients 
              frais de notre ferme biologique.
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 max-w-md mx-auto"
          >
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Rechercher un plat, ingrédient..."
            />
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-6 flex justify-center"
          >
            <MenuFilters
              activeTags={activeTags}
              onTagToggle={handleTagToggle}
              onClearFilters={handleClearFilters}
            />
          </motion.div>

          {/* Results count */}
          {isFiltered && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-sm text-muted-foreground"
            >
              {totalItems} {totalItems === 1 ? "plat trouvé" : "plats trouvés"}
            </motion.p>
          )}
        </div>
      </section>

      {/* Category Navigation */}
      <CategoryNav
        activeCategory={activeCategory}
        onCategoryClick={handleCategoryClick}
      />

      {/* Menu Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {itemsByCategory.size === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <p className="text-xl text-muted-foreground">
              Aucun plat ne correspond à votre recherche.
            </p>
            <button
              onClick={handleClearFilters}
              className="mt-4 text-accent hover:text-accent-hover underline"
            >
              Effacer les filtres
            </button>
          </motion.div>
        ) : (
          <div className="space-y-16">
            {MENU_CATEGORIES.map((category) => {
              const items = itemsByCategory.get(category.id);
              if (!items) return null;
              
              return (
                <MenuSection
                  key={category.id}
                  category={category}
                  items={items}
                  onInView={handleCategoryInView}
                  onItemClick={handleItemClick}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Pasta & Sauce Info Footer */}
      <section className="bg-secondary py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Pasta Options */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <h3 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
                <span>🍝</span> Choix des Pâtes
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Toutes nos recettes de pâtes peuvent être préparées avec:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Spaghetti", "Linguine", "Penne", "Rigatoni", "Tagliatelle fraîches"].map((pasta) => (
                  <span
                    key={pasta}
                    className="px-3 py-1 bg-secondary rounded-full text-sm text-foreground"
                  >
                    {pasta}
                  </span>
                ))}
              </div>
            </div>

            {/* Sauce Options */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <h3 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
                <span>🥩</span> Sauces pour Viandes
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Nos plats de viande sont servis avec la sauce de votre choix:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Champignons", "Poivre vert", "Crème de truffe", "Café de Paris"].map((sauce) => (
                  <span
                    key={sauce}
                    className="px-3 py-1 bg-secondary rounded-full text-sm text-foreground"
                  >
                    {sauce}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Accompaniments */}
          <div className="mt-8 bg-card rounded-xl p-6 border border-border">
            <h3 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <span>🍽️</span> Accompagnements (Secondi Piatti)
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Tous nos plats principaux sont servis avec 2 accompagnements au choix:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "Purée de pommes de terre maison",
                "Pommes de terre rôties au four",
                "Légumes sautés de saison",
                "Pâtes avec sauce au choix"
              ].map((side) => (
                <span
                  key={side}
                  className="px-3 py-1 bg-secondary rounded-full text-sm text-foreground"
                >
                  {side}
                </span>
              ))}
            </div>
          </div>

          {/* Farm Note */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground italic">
              🌿 Nos ingrédients proviennent directement de notre ferme biologique
            </p>
          </div>
        </div>
      </section>

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />
    </div>
  );
}
