"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Star, UtensilsCrossed, Leaf, Fish, Flame, Milk, Beef, Heart } from "lucide-react";
import { MenuItem as MenuItemType, MenuTag } from "@/lib/menu-types";

// Elegant tag icons
const TAG_ICONS: Record<MenuTag, React.ReactNode> = {
  vegetarian: <Leaf className="w-3 h-3" />,
  seafood: <Fish className="w-3 h-3" />,
  truffle: <Star className="w-3 h-3" />,
  spicy: <Flame className="w-3 h-3" />,
  cheese: <Milk className="w-3 h-3" />,
  meat: <Beef className="w-3 h-3" />,
  healthy: <Heart className="w-3 h-3" />,
  signature: <Star className="w-3 h-3" />,
};

interface MenuItemProps {
  item: MenuItemType;
  index: number;
  onClick: () => void;
}

export function MenuItem({ item, index, onClick }: MenuItemProps) {
  const hasImage = item.image && item.image !== "";

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.2) }}
      onClick={onClick}
      className={`
        group relative bg-card rounded-xl border cursor-pointer
        transition-all duration-200 overflow-hidden
        ${item.isSignature 
          ? "border-accent/40 ring-1 ring-accent/20" 
          : "border-border hover:border-accent/30"
        }
        hover:shadow-lg hover:shadow-accent/5 hover:-translate-y-0.5
      `}
    >
      {/* Image Section */}
      {hasImage ? (
        <div className="relative aspect-4/3 bg-secondary overflow-hidden">
          <Image
            src={item.image!}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Signature Badge */}
          {item.isSignature && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-wide rounded-md shadow-lg">
              <Star size={10} className="fill-current" />
              <span>Signature</span>
            </div>
          )}

          {/* Price Badge */}
          <div className="absolute bottom-2 right-2 px-2.5 py-1 bg-primary/90 backdrop-blur-sm rounded-lg shadow-lg">
            <span className="text-lg font-bold text-accent">{item.price}</span>
            <span className="text-[10px] text-muted-foreground ml-0.5">DH</span>
          </div>

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ) : (
        <div className="relative flex items-center justify-between px-3 py-2.5 bg-secondary/40">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-accent/40" />
            {item.isSignature && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-wide rounded">
                <Star size={8} className="fill-current" />
                <span>Signature</span>
              </div>
            )}
          </div>
          <div className="px-2 py-0.5 bg-primary/80 rounded-md">
            <span className="text-sm font-bold text-accent">{item.price}</span>
            <span className="text-[9px] text-muted-foreground ml-0.5">DH</span>
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="p-3">
        {/* Title */}
        <h3 className="font-heading text-sm font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-1">
          {item.name}
        </h3>
        
        {/* Description */}
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-10">
          {item.description}
        </p>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="mt-2 flex items-center gap-1">
            {item.tags.slice(0, 4).map((tag) => {
              const icon = TAG_ICONS[tag as MenuTag];
              if (!icon) return null;
              return (
                <span
                  key={tag}
                  className="inline-flex items-center justify-center w-5 h-5 rounded bg-secondary/80 text-muted-foreground"
                >
                  {icon}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </motion.article>
  );
}
