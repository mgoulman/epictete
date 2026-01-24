"use client";

import { motion } from "framer-motion";
import { TAG_INFO, MenuTag } from "@/lib/menu-types";

interface MenuFiltersProps {
  activeTags: MenuTag[];
  onTagToggle: (tag: MenuTag) => void;
  onClearFilters: () => void;
}

const FILTER_TAGS: MenuTag[] = ['vegetarian', 'seafood', 'truffle', 'spicy', 'cheese', 'meat', 'healthy'];

export function MenuFilters({ activeTags, onTagToggle, onClearFilters }: MenuFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground mr-1">Filtres:</span>
      
      {FILTER_TAGS.map((tag) => {
        const tagInfo = TAG_INFO[tag];
        const isActive = activeTags.includes(tag);
        
        return (
          <motion.button
            key={tag}
            onClick={() => onTagToggle(tag)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
              border transition-all duration-200
              ${isActive 
                ? "bg-accent text-accent-foreground border-accent" 
                : "bg-card text-muted-foreground border-border hover:border-accent/50 hover:text-foreground"
              }
            `}
          >
            <span>{tagInfo.icon}</span>
            <span>{tagInfo.labelFr}</span>
          </motion.button>
        );
      })}

      {activeTags.length > 0 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onClearFilters}
          className="text-sm text-muted-foreground hover:text-accent transition-colors underline ml-2"
        >
          Effacer tout
        </motion.button>
      )}
    </div>
  );
}
