"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Star, Quote, Instagram } from "lucide-react";
import { Section, SectionHeader } from "@/components/layout/section";

const testimonials = [
  {
    id: 1,
    name: "Yasmine K.",
    role: "Client régulier",
    content:
      "Les pizzas au feu de bois sont incroyables ! Le cadre est magnifique et le service impeccable. Un vrai bijou à Bouskoura.",
    rating: 5,
    source: "Google",
  },
  {
    id: 2,
    name: "Mehdi A.",
    role: "Food Lover",
    content:
      "Une découverte exceptionnelle. Les pâtes fraîches maison sont un délice et l'ambiance Art Déco est sublime. Je recommande vivement !",
    rating: 5,
    source: "Instagram",
  },
  {
    id: 3,
    name: "Sarah L.",
    role: "Famille",
    content:
      "Parfait pour un déjeuner en famille. Les produits sont frais, bio de leur propre ferme. Les enfants ont adoré les pizzas !",
    rating: 5,
    source: "TripAdvisor",
  },
];

export function TestimonialsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <Section className="bg-secondary">
      <SectionHeader
        eyebrow="Témoignages"
        title="Ce qu'ils en disent"
        description="L'avis de nos clients qui ont vécu l'expérience Epictete."
      />

      <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-8">
        {testimonials.map((testimonial, index) => (
          <motion.div
            key={testimonial.id}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: index * 0.15 }}
            className="relative bg-card border border-border rounded-2xl p-5 sm:p-6 md:p-8 hover:border-accent/50 transition-colors"
          >
            <Quote className="absolute top-4 right-4 sm:top-6 sm:right-6 w-6 h-6 sm:w-8 sm:h-8 text-accent/20" />
            
            <div className="flex items-center gap-1 mb-3 sm:mb-4">
              {Array.from({ length: testimonial.rating }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-accent text-accent" />
              ))}
              <span className="ml-2 text-xs text-muted-foreground">
                via {testimonial.source}
              </span>
            </div>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4 sm:mb-6">
              &ldquo;{testimonial.content}&rdquo;
            </p>

            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <span className="text-accent font-heading font-semibold text-sm sm:text-base">
                  {testimonial.name.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-medium text-foreground text-sm sm:text-base">{testimonial.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{testimonial.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Instagram CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-8 sm:mt-12 text-center"
      >
        <a
          href="https://instagram.com/epictete.restaurant"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors group"
        >
          <Instagram size={18} />
          <span className="text-sm">Suivez-nous sur Instagram @epictete.restaurant</span>
        </a>
      </motion.div>
    </Section>
  );
}
