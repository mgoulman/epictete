"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Flame } from "lucide-react";
import { Section, SectionHeader } from "@/components/layout/section";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";

const dishes = [
  {
    id: 1,
    name: "Pizza Napoletana",
    description: "Pizza authentique cuite au feu de bois, mozzarella di bufala, tomates San Marzano, basilic frais.",
    category: "Pizza",
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80",
    featured: true,
  },
  {
    id: 2,
    name: "Tagliatelle al Pesto",
    description: "Pâtes fraîches maison, pesto de basilic bio de notre ferme, pignons de pin torréfiés.",
    category: "Pasta",
    image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&q=80",
  },
  {
    id: 3,
    name: "Filetto di Manzo",
    description: "Filet de bœuf premium grillé, réduction balsamique, légumes de saison rôtis.",
    category: "Viande",
    image: "https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80",
  },
  {
    id: 4,
    name: "Tiramisu",
    description: "Dessert italien classique, mascarpone onctueux, café espresso, cacao amer.",
    category: "Dessert",
    image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&q=80",
  },
];

export function FeaturedDishesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <Section id="menu-preview" className="bg-primary">
      <SectionHeader
        eyebrow="Notre Carte"
        title="Créations Signatures"
        description="Cuisine italienne gastronomique avec des ingrédients frais de notre ferme biologique."
      />

      <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {dishes.map((dish, index) => (
          <motion.div
            key={dish.id}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <Card className="group h-full overflow-hidden">
              <div className="relative aspect-4/3 overflow-hidden">
                <Image
                  src={dish.image}
                  alt={`${dish.name} - ${dish.description}`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-linear-to-t from-primary/80 via-primary/20 to-transparent" />
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary/90 backdrop-blur-sm text-xs font-medium text-foreground rounded-full">
                    {dish.featured && <Flame size={12} className="text-accent" />}
                    {dish.category}
                  </span>
                </div>
              </div>
              <CardContent className="p-4 sm:p-5">
                <CardTitle className="text-base sm:text-lg">{dish.name}</CardTitle>
                <CardDescription className="text-sm line-clamp-2 mt-1.5">{dish.description}</CardDescription>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-8 sm:mt-12 text-center"
      >
        <Link
          href="/menu"
          className="inline-flex items-center gap-2 px-6 py-3 bg-secondary hover:bg-card text-foreground rounded-xl transition-all group touch-manipulation"
        >
          <span className="font-medium">Voir la carte complète</span>
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </motion.div>
    </Section>
  );
}
