"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Lightbulb, ChefHat, Star } from "lucide-react";
import { MenuItem, TAG_INFO, REGION_INFO, PASTA_OPTIONS, SAUCE_OPTIONS } from "@/lib/menu-types";

interface ItemDetailModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ItemDetailModal({ item, isOpen, onClose }: ItemDetailModalProps) {
  // Close on escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleKeyDown]);

  if (!item) return null;

  const regionInfo = item.story?.region ? REGION_INFO[item.story.region] : null;
  const hasPastaCustomization = item.customizations?.some(c => c.type === 'pasta');
  const hasSauceCustomization = item.customizations?.some(c => c.type === 'sauce');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-3 bottom-3 top-[10vh]
                       md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
                       md:max-w-lg md:w-full md:max-h-[85vh]
                       bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Sticky close bar */}
            <div className="flex items-center justify-end px-3 pt-3">
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-secondary/80 hover:bg-secondary
                           text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Header */}
            <div className="px-6 pb-4">
              {/* Region badge */}
              {regionInfo && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10
                                border border-accent/30 text-accent text-sm mb-3">
                  <MapPin size={14} />
                  <span>{regionInfo.emoji} {regionInfo.nameFr}</span>
                </div>
              )}

              {/* Title */}
              <h2 className="text-2xl font-heading font-semibold text-foreground">
                {item.name}
              </h2>

              {/* Signature badge */}
              {item.isSignature && (
                <div className="flex items-center gap-1 text-accent text-sm mt-1">
                  <Star size={14} className="fill-current" />
                  <span>Signature du Chef</span>
                </div>
              )}

              {/* Price */}
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-accent">{item.price}</span>
                <span className="text-sm text-muted-foreground">DHS</span>
              </div>

              {/* Tags */}
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {item.tags.map((tag) => {
                    const tagInfo = TAG_INFO[tag];
                    return (
                      <span
                        key={tag}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                    text-xs bg-secondary ${tagInfo.color}`}
                      >
                        <span>{tagInfo.icon}</span>
                        <span>{tagInfo.labelFr}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-b border-border/50" />

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Description */}
              <p className="text-muted-foreground">{item.description}</p>

              {/* Story Section - Single Cohesive Narrative */}
              {item.story && (
                <div className="space-y-4">
                  {/* Main Narrative */}
                  <div className="relative">
                    <div className="absolute -left-1 top-0 bottom-0 w-1 bg-gradient-to-b from-accent via-accent/50 to-transparent rounded-full" />
                    <div className="pl-5">
                      <div className="flex items-center gap-2 text-accent mb-3">
                        <ChefHat size={18} />
                        <span className="font-medium text-sm uppercase tracking-wider">L&apos;Histoire</span>
                      </div>
                      <p className="text-foreground/90 leading-relaxed">
                        {item.story.narrative}
                      </p>
                    </div>
                  </div>

                  {/* Fun Fact - The "Flex" */}
                  {item.story.funFact && (
                    <div className="bg-accent/5 rounded-xl p-4 border border-accent/20">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                          <Lightbulb size={16} className="text-accent" />
                        </div>
                        <div>
                          <span className="text-xs font-medium text-accent uppercase tracking-wider">Le saviez-vous ?</span>
                          <p className="text-sm text-foreground/80 mt-1">
                            {item.story.funFact}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Ingredients */}
              {item.ingredients.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Ingrédients</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.ingredients.join(" • ")}
                  </p>
                </div>
              )}

              {/* Customizations */}
              {(hasPastaCustomization || hasSauceCustomization) && (
                <div className="space-y-3 pt-2 border-t border-border/50">
                  {hasPastaCustomization && (
                    <div>
                      <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                        <span>🍝</span> {PASTA_OPTIONS.labelFr}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {PASTA_OPTIONS.options.map((pasta) => (
                          <span
                            key={pasta}
                            className="px-3 py-1.5 bg-secondary rounded-full text-sm text-foreground/80 
                                       hover:bg-accent/20 hover:text-accent cursor-pointer transition-colors"
                          >
                            {pasta}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasSauceCustomization && (
                    <div>
                      <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                        <span>🥩</span> {SAUCE_OPTIONS.labelFr}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {SAUCE_OPTIONS.options.map((sauce) => (
                          <span
                            key={sauce}
                            className="px-3 py-1.5 bg-secondary rounded-full text-sm text-foreground/80 
                                       hover:bg-accent/20 hover:text-accent cursor-pointer transition-colors"
                          >
                            {sauce}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Chef Note */}
              {item.chefNote && (
                <div className="text-sm text-accent italic border-l-2 border-accent pl-3">
                  ✨ {item.chefNote}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border/50 bg-secondary/30">
              <p className="text-xs text-muted-foreground text-center">
                🌿 Ingrédients frais de notre ferme biologique
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
