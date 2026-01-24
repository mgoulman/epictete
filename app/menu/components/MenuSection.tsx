"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { MenuItem as MenuItemType, MenuCategoryInfo } from "@/lib/menu-types";
import { MenuItem } from "./MenuItem";

interface MenuSectionProps {
  category: MenuCategoryInfo;
  items: MenuItemType[];
  onInView: (categoryId: string) => void;
  onItemClick: (item: MenuItemType) => void;
}

export function MenuSection({ category, items, onInView, onItemClick }: MenuSectionProps) {
  const ref = useRef<HTMLElement>(null);

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

  return (
    <section
      ref={ref}
      id={`category-${category.id}`}
      className="scroll-mt-32"
    >
      {/* Category Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">{category.icon}</span>
          <div>
            <h2 className="text-2xl md:text-3xl font-heading font-semibold text-foreground">
              {category.nameFr}
            </h2>
            {category.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {category.description}
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 h-px bg-linear-to-r from-accent/50 via-border to-transparent" />
      </motion.div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item, index) => (
          <MenuItem 
            key={item.id} 
            item={item} 
            index={index} 
            onClick={() => onItemClick(item)}
          />
        ))}
      </div>
    </section>
  );
}
