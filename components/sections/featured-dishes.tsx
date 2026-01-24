"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section, SectionHeader } from "@/components/layout/section";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";

const dishes = [
  {
    id: 1,
    name: "Tajine d'Agneau",
    description: "Agneau confit aux épices, pruneaux et amandes, servi avec couscous aux sept légumes.",
    price: "280 MAD",
    image: "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=600&q=80",
  },
  {
    id: 2,
    name: "Pastilla Royale",
    description: "Feuilleté croustillant au pigeon, amandes caramélisées et cannelle.",
    price: "320 MAD",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80",
  },
  {
    id: 3,
    name: "Couscous Royal",
    description: "Couscous fin garni d'agneau, poulet et merguez, légumes de saison.",
    price: "350 MAD",
    image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80",
  },
  {
    id: 4,
    name: "Méditation Sucrée",
    description: "Assortiment de pâtisseries marocaines, thé à la menthe et miel d'argan.",
    price: "150 MAD",
    image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&q=80",
  },
];

export function FeaturedDishesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <Section id="menu-preview" className="bg-primary">
      <SectionHeader
        eyebrow="Notre Carte"
        title="Créations Signatures"
        description="Découvrez nos plats emblématiques, préparés avec passion et les meilleurs ingrédients du terroir."
      />

      <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dishes.map((dish, index) => (
          <motion.div
            key={dish.id}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <Card className="group h-full">
              <div className="relative aspect-[4/3] overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${dish.image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent" />
                <div className="absolute bottom-4 right-4">
                  <span className="px-3 py-1 bg-accent text-accent-foreground text-sm font-medium rounded-full">
                    {dish.price}
                  </span>
                </div>
              </div>
              <CardContent>
                <CardTitle>{dish.name}</CardTitle>
                <CardDescription>{dish.description}</CardDescription>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-12 text-center"
      >
        <Link
          href="/menu"
          className="inline-flex items-center gap-2 text-accent hover:text-accent-hover transition-colors group"
        >
          <span className="font-medium">Voir la carte complète</span>
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </motion.div>
    </Section>
  );
}
