"use client";

import { motion } from "framer-motion";
import { Star, BookOpen, MapPin } from "lucide-react";
import { MenuItem as MenuItemType, TAG_INFO, REGION_INFO } from "@/lib/menu-types";

interface MenuItemProps {
  item: MenuItemType;
  index: number;
  onClick: () => void;
}

export function MenuItem({ item, index, onClick }: MenuItemProps) {
  const regionInfo = item.story?.region ? REGION_INFO[item.story.region] : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      onClick={onClick}
      className={`
        group relative bg-card rounded-xl border border-border p-4 cursor-pointer
        hover:border-accent/40 hover:bg-card/80 transition-all duration-300
        ${item.isSignature ? "ring-1 ring-accent/20" : ""}
      `}
    >
      {/* Signature Badge */}
      {item.isSignature && (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-1 bg-accent text-accent-foreground text-xs font-semibold rounded-full z-10">
          <Star size={12} className="fill-current" />
          <span>Signature</span>
        </div>
      )}

      {/* Region Badge (small) */}
      {regionInfo && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <MapPin size={12} className="text-accent" />
          <span>{regionInfo.emoji} {regionInfo.nameFr}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-base font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-1">
            {item.name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
            {item.description}
          </p>
        </div>
        
        {/* Price */}
        <div className="shrink-0 text-right">
          <span className="text-lg font-semibold text-accent">
            {item.price}
          </span>
          <span className="text-xs text-muted-foreground ml-0.5">DHS</span>
        </div>
      </div>

      {/* Tags (compact) */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => {
            const tagInfo = TAG_INFO[tag];
            if (!tagInfo) return null;
            return (
              <span
                key={tag}
                className="text-sm"
                title={tagInfo.labelFr}
              >
                {tagInfo.icon}
              </span>
            );
          })}
          {item.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">+{item.tags.length - 3}</span>
          )}
        </div>

        {/* Story indicator */}
        {item.story && (
          <div className="flex items-center gap-1 text-xs text-accent/70 group-hover:text-accent transition-colors">
            <BookOpen size={12} />
            <span className="hidden sm:inline">Découvrir</span>
          </div>
        )}
      </div>

      {/* Hover Glow Effect */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: "radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(201, 169, 98, 0.08), transparent 40%)",
        }}
      />
    </motion.article>
  );
}
