"use client";

import { motion } from "framer-motion";
import { MENU_CATEGORIES, MenuCategory } from "@/lib/menu-types";

interface CategoryNavProps {
  activeCategory: MenuCategory | null;
  onCategoryClick: (category: MenuCategory) => void;
}

export function CategoryNav({ activeCategory, onCategoryClick }: CategoryNavProps) {
  return (
    <nav className="sticky top-16 z-40 bg-primary/95 backdrop-blur-md border-b border-border py-3">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mb-2">
          {MENU_CATEGORIES.map((category) => {
            const isActive = activeCategory === category.id;
            return (
              <motion.button
                key={category.id}
                onClick={() => onCategoryClick(category.id)}
                className={`
                  relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                  whitespace-nowrap transition-colors duration-200
                  ${isActive 
                    ? "text-accent-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-card"
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeCategory"
                    className="absolute inset-0 bg-accent rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10 text-lg">{category.icon}</span>
                <span className="relative z-10">{category.nameFr}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
