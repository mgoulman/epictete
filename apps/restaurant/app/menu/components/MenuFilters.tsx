"use client";

import { motion } from "framer-motion";
import { MenuTag } from "@/lib/menu-types";
import { Leaf, Fish, Flame, Milk, Beef, Heart, X } from "lucide-react";

interface MenuFiltersProps {
  activeTags: MenuTag[];
  onTagToggle: (tag: MenuTag) => void;
  onClearFilters: () => void;
}

// Elegant filter definitions with Lucide icons
const FILTERS: { tag: MenuTag; label: string; icon: React.ReactNode }[] = [
  { tag: 'vegetarian', label: 'Végétarien', icon: <Leaf className="w-3.5 h-3.5" /> },
  { tag: 'seafood', label: 'Fruits de mer', icon: <Fish className="w-3.5 h-3.5" /> },
  { tag: 'spicy', label: 'Épicé', icon: <Flame className="w-3.5 h-3.5" /> },
  { tag: 'cheese', label: 'Fromage', icon: <Milk className="w-3.5 h-3.5" /> },
  { tag: 'meat', label: 'Viande', icon: <Beef className="w-3.5 h-3.5" /> },
  { tag: 'healthy', label: 'Santé', icon: <Heart className="w-3.5 h-3.5" /> },
];

export function MenuFilters({ activeTags, onTagToggle, onClearFilters }: MenuFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {FILTERS.map(({ tag, label, icon }) => {
        const isActive = activeTags.includes(tag);
        
        return (
          <button
            key={tag}
            onClick={() => onTagToggle(tag)}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium uppercase tracking-wide
              border rounded transition-all duration-200
              ${isActive 
                ? "bg-accent text-accent-foreground border-accent" 
                : "bg-transparent text-muted-foreground border-border/60 hover:border-accent/50 hover:text-foreground"
              }
            `}
          >
            {icon}
            <span>{label}</span>
          </button>
        );
      })}

      {activeTags.length > 0 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onClearFilters}
          className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          <X className="w-3 h-3" />
          <span>Effacer</span>
        </motion.button>
      )}
    </div>
  );
}
