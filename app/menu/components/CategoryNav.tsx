"use client";

import { motion } from "framer-motion";
import { MenuCategory } from "@/lib/menu-types";
import { MenuCategory as DBMenuCategory } from "@/lib/supabase";
import { getCategoryAvailabilityStatus } from "@/lib/time-availability";
import { 
  Clock, ChevronLeft, ChevronRight,
  Croissant, Egg, UtensilsCrossed, Salad, 
  Soup, Pizza, Beef, Sandwich, 
  CookingPot, Hamburger, Cake, Coffee
} from "lucide-react";
import { useRef, useState, useEffect } from "react";

// Elegant category icons mapping
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'brunch': <Croissant className="w-4 h-4" />,
  'breakfast': <Egg className="w-4 h-4" />,
  'antipasti': <UtensilsCrossed className="w-4 h-4" />,
  'salads': <Salad className="w-4 h-4" />,
  'pasta': <Soup className="w-4 h-4" />,
  'pizza': <Pizza className="w-4 h-4" />,
  'meat': <Beef className="w-4 h-4" />,
  'ravioli': <Sandwich className="w-4 h-4" />,
  'risotto': <CookingPot className="w-4 h-4" />,
  'burgers': <Hamburger className="w-4 h-4" />,
  'desserts': <Cake className="w-4 h-4" />,
  'drinks': <Coffee className="w-4 h-4" />,
};

interface CategoryNavProps {
  activeCategory: MenuCategory | null;
  onCategoryClick: (category: MenuCategory) => void;
  categories: DBMenuCategory[];
}

export function CategoryNav({ activeCategory, onCategoryClick, categories }: CategoryNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categories]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <nav className="sticky top-16 sm:top-20 z-40 bg-secondary/95 backdrop-blur-md border-y border-border/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="relative flex items-center">
          {/* Left scroll button */}
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 z-10 p-1.5 bg-secondary/90 border border-border rounded-full shadow-lg hover:bg-card transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
          )}

          {/* Categories */}
          <div 
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide py-3 px-1 scroll-smooth"
          >
            {categories.map((category) => {
              const isActive = activeCategory === category.id;
              const { isAvailable, isHighlighted, availabilityTag } = getCategoryAvailabilityStatus(category);
              
              return (
                <motion.button
                  key={category.id}
                  onClick={() => onCategoryClick(category.id as MenuCategory)}
                  className={`
                    relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium
                    whitespace-nowrap transition-all duration-200 border
                    ${!isAvailable ? "opacity-50 grayscale" : ""}
                    ${isActive 
                      ? "bg-accent text-accent-foreground border-accent shadow-md shadow-accent/20" 
                      : "bg-card/50 text-muted-foreground border-border/50 hover:text-foreground hover:bg-card hover:border-border"
                    }
                  `}
                  whileHover={{ scale: isAvailable ? 1.03 : 1 }}
                  whileTap={{ scale: isAvailable ? 0.97 : 1 }}
                >
                  {/* Animated border for highlighted brunch */}
                  {isHighlighted && !isActive && (
                    <motion.div
                      className="absolute -inset-[2px] rounded-full bg-linear-to-r from-accent via-amber-400 to-accent opacity-70"
                      animate={{
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      style={{ backgroundSize: "200% 200%" }}
                    />
                  )}
                  {isHighlighted && !isActive && (
                    <div className="absolute inset-0 rounded-full bg-card" />
                  )}
                  
                  <span className="relative z-10">
                    {CATEGORY_ICONS[category.id] || <UtensilsCrossed className="w-4 h-4" />}
                  </span>
                  <span className="relative z-10">{category.name_fr}</span>
                  
                  {/* Availability indicator */}
                  {availabilityTag && (
                    <span className="relative z-10 flex items-center">
                      <Clock className="w-3 h-3 text-accent" />
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Right scroll button */}
          {showRightArrow && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 z-10 p-1.5 bg-secondary/90 border border-border rounded-full shadow-lg hover:bg-card transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
