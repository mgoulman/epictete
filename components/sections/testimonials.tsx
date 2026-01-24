"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Star, Quote } from "lucide-react";
import { Section, SectionHeader } from "@/components/layout/section";

const testimonials = [
  {
    id: 1,
    name: "Sophie Martin",
    role: "Guide Michelin",
    content:
      "Une expérience culinaire exceptionnelle. Le chef maîtrise parfaitement l'équilibre entre tradition marocaine et touches contemporaines.",
    rating: 5,
  },
  {
    id: 2,
    name: "Jean-Pierre Dubois",
    role: "Critique gastronomique",
    content:
      "Epictete transcende la simple restauration pour offrir une véritable philosophie du goût. Chaque visite est une révélation.",
    rating: 5,
  },
  {
    id: 3,
    name: "Amira Benali",
    role: "Food Blogger",
    content:
      "L'ambiance, le service, la cuisine - tout est pensé pour créer un moment de pure excellence. Un incontournable à Marrakech.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <Section className="bg-secondary">
      <SectionHeader
        eyebrow="Témoignages"
        title="Ce qu'ils en disent"
        description="Découvrez les expériences de nos clients et critiques gastronomiques."
      />

      <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {testimonials.map((testimonial, index) => (
          <motion.div
            key={testimonial.id}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: index * 0.15 }}
            className="relative bg-card border border-border rounded-2xl p-8 hover:border-accent/50 transition-colors"
          >
            <Quote className="absolute top-6 right-6 w-8 h-8 text-accent/20" />
            
            <div className="flex gap-1 mb-4">
              {Array.from({ length: testimonial.rating }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-accent text-accent" />
              ))}
            </div>

            <p className="text-muted-foreground leading-relaxed mb-6">
              &ldquo;{testimonial.content}&rdquo;
            </p>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <span className="text-accent font-heading font-semibold">
                  {testimonial.name.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-medium text-foreground">{testimonial.name}</p>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
