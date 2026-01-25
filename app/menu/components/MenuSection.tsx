"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { MenuItem as MenuItemType, MenuCategoryInfo } from "@/lib/menu-types";
import { MenuCategory as DBMenuCategory } from "@/lib/supabase";
import { getCategoryAvailabilityStatus } from "@/lib/time-availability";
import { MenuItem } from "./MenuItem";
import { 
  Clock, Croissant, Egg, UtensilsCrossed, Salad, 
  Soup, Pizza, Beef, Sandwich, CookingPot, Hamburger, Cake, Coffee 
} from "lucide-react";

// Elegant category icons
const SECTION_ICONS: Record<string, React.ReactNode> = {
  'brunch': <Croissant className="w-6 h-6" />,
  'breakfast': <Egg className="w-6 h-6" />,
  'antipasti': <UtensilsCrossed className="w-6 h-6" />,
  'salads': <Salad className="w-6 h-6" />,
  'pasta': <Soup className="w-6 h-6" />,
  'pizza': <Pizza className="w-6 h-6" />,
  'meat': <Beef className="w-6 h-6" />,
  'ravioli': <Sandwich className="w-6 h-6" />,
  'risotto': <CookingPot className="w-6 h-6" />,
  'burgers': <Hamburger className="w-6 h-6" />,
  'desserts': <Cake className="w-6 h-6" />,
  'drinks': <Coffee className="w-6 h-6" />,
};

interface MenuSectionProps {
  category: MenuCategoryInfo;
  dbCategory?: DBMenuCategory;
  items: MenuItemType[];
  extrasItems?: MenuItemType[];
  onInView: (categoryId: string) => void;
  onItemClick: (item: MenuItemType) => void;
}

export function MenuSection({ category, dbCategory, items, extrasItems, onInView, onItemClick }: MenuSectionProps) {
  const ref = useRef<HTMLElement>(null);
  
  const availability = dbCategory 
    ? getCategoryAvailabilityStatus(dbCategory) 
    : { isAvailable: true, isHighlighted: false, availabilityTag: null };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onInView(category.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [category.id, onInView]);

  if (items.length === 0) return null;

  // Animated border styles for highlighted categories (Taskade-style glow)
  const glowBorderClass = availability.isHighlighted 
    ? 'relative before:absolute before:inset-0 before:rounded-2xl before:p-[1px] before:bg-gradient-to-r before:from-accent/60 before:via-accent before:to-accent/60 before:animate-border-glow before:-z-10 after:absolute after:inset-[1px] after:rounded-[15px] after:bg-primary after:-z-10'
    : '';

  return (
    <section
      ref={ref}
      id={`category-${category.id}`}
      className={`scroll-mt-36 ${!availability.isAvailable ? 'opacity-60' : ''}`}
    >
      {/* Category Container with Border */}
      <div className={`
        relative rounded-2xl border p-6 sm:p-8 transition-all duration-300
        ${availability.isHighlighted 
          ? 'border-accent/50 bg-linear-to-br from-accent/5 via-transparent to-accent/5 shadow-[0_0_40px_-10px_rgba(201,169,98,0.3)]' 
          : 'border-border/40 bg-card/20 hover:border-border/60'
        }
        ${glowBorderClass}
      `}>
        {/* Animated corner accents for highlighted */}
        {availability.isHighlighted && (
          <>
            <motion.div 
              className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-accent rounded-tl-2xl"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div 
              className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-accent rounded-tr-2xl"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
            <motion.div 
              className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-accent rounded-bl-2xl"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            />
            <motion.div 
              className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-accent rounded-br-2xl"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
            />
          </>
        )}

        {/* Category Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
        <div className="flex items-center gap-4">
          {/* Icon with optional animation */}
          {availability.isHighlighted ? (
            <motion.div
              className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 text-accent"
              animate={{
                boxShadow: [
                  "0 0 15px rgba(201, 169, 98, 0.3)",
                  "0 0 30px rgba(201, 169, 98, 0.5)",
                  "0 0 15px rgba(201, 169, 98, 0.3)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {SECTION_ICONS[category.id] || <UtensilsCrossed className="w-6 h-6" />}
            </motion.div>
          ) : (
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary border border-border/50 text-muted-foreground">
              {SECTION_ICONS[category.id] || <UtensilsCrossed className="w-6 h-6" />}
            </div>
          )}
          
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-semibold text-foreground">
                {category.nameFr}
              </h2>
              {/* Availability tag */}
              {availability.availabilityTag && (
                <span className={`
                  inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-medium uppercase tracking-wide
                  ${availability.isAvailable 
                    ? 'bg-accent/15 text-accent border border-accent/20' 
                    : 'bg-secondary text-muted-foreground border border-border/50'
                  }
                `}>
                  <Clock className="w-3 h-3" />
                  {availability.availabilityTag}
                </span>
              )}
            </div>
            {category.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {category.description}
              </p>
            )}
            {/* Item count */}
            <p className="text-xs text-muted-foreground/70 mt-1">
              {items.length} {items.length === 1 ? 'plat' : 'plats'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Items Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 ${!availability.isAvailable ? 'pointer-events-none' : ''}`}>
        {items.map((item, index) => (
          <MenuItem 
            key={item.id} 
            item={item} 
            index={index} 
            onClick={() => onItemClick(item)}
          />
        ))}
      </div>

      {/* Extras/Add-ons Section (for Brunch) */}
      {extrasItems && extrasItems.length > 0 && (
        <div className={`mt-10 ${!availability.isAvailable ? 'pointer-events-none' : ''}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-border/50" />
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              À la Carte & Accompagnements
            </h3>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {extrasItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onItemClick(item)}
                className="group bg-card/40 hover:bg-card border border-border/50 hover:border-accent/30 rounded-xl p-3 text-left transition-all duration-200 hover:-translate-y-0.5"
              >
                <p className="font-medium text-sm text-foreground group-hover:text-accent transition-colors line-clamp-1">
                  {item.name}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {item.description}
                </p>
                <p className="mt-2 text-accent font-bold text-sm">
                  {item.price}<span className="text-xs text-muted-foreground font-normal ml-0.5">DH</span>
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
