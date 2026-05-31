"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { Section, SectionHeader } from "@/components/layout/section";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/auth/supabase-browser";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useSiteContent } from "@/lib/hooks/useSiteContent";

interface FeaturedDish {
  id: string;
  name: string;
  name_fr: string;
  description: string | null;
  image_url: string | null;
  is_signature: boolean;
  category: {
    name_fr: string;
  } | null;
}

const fallbackDishes: FeaturedDish[] = [
  {
    id: "1",
    name: "Pizza Napoletana",
    name_fr: "Pizza Napoletana",
    description: "Pizza authentique cuite au feu de bois, mozzarella di bufala, tomates San Marzano, basilic frais.",
    category: { name_fr: "Pizza" },
    image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80",
    is_signature: true,
  },
  {
    id: "2",
    name: "Tagliatelle al Pesto",
    name_fr: "Tagliatelle al Pesto",
    description: "Pâtes fraîches maison, pesto de basilic bio de notre ferme, pignons de pin torréfiés.",
    category: { name_fr: "Pasta" },
    image_url: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&q=80",
    is_signature: false,
  },
  {
    id: "3",
    name: "Filetto di Manzo",
    name_fr: "Filetto di Manzo",
    description: "Filet de bœuf premium grillé, réduction balsamique, légumes de saison rôtis.",
    category: { name_fr: "Viande" },
    image_url: "https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80",
    is_signature: false,
  },
  {
    id: "4",
    name: "Tiramisu",
    name_fr: "Tiramisu",
    description: "Dessert italien classique, mascarpone onctueux, café espresso, cacao amer.",
    category: { name_fr: "Dessert" },
    image_url: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&q=80",
    is_signature: false,
  },
];

export function FeaturedDishesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [dishes, setDishes] = useState<FeaturedDish[]>(fallbackDishes);
  const { t } = useTranslation();
  const { getSectionText } = useSiteContent();
  const s = (key: string, fallback: string) => getSectionText('featuredDishes', key, fallback);

  useEffect(() => {
    async function fetchFeatured() {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("menu_items")
        .select("id, name, name_fr, description, image_url, is_signature, category:menu_categories(name_fr)")
        .eq("is_featured", true)
        .eq("is_available", true)
        .order("sort_order")
        .limit(4);
      if (data && data.length > 0) {
        setDishes(data as unknown as FeaturedDish[]);
      }
    }
    fetchFeatured();
  }, []);

  return (
    <Section id="menu-preview" className="bg-primary">
      <SectionHeader
        eyebrow={s('eyebrow', t.featuredDishes.eyebrow)}
        title={s('title', t.featuredDishes.title)}
        description={s('description', t.featuredDishes.description)}
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
                {dish.image_url ? (
                  <img
                    src={dish.image_url}
                    alt={`${dish.name_fr} - ${dish.description || ""}`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center">
                    <span className="text-4xl">{dish.category?.name_fr === "Pizza" ? "🍕" : "🍽️"}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-linear-to-t from-primary/80 via-primary/20 to-transparent" />
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary/90 backdrop-blur-sm text-xs font-medium text-foreground rounded-full">
                    {dish.is_signature && <Flame size={12} className="text-accent" />}
                    {dish.category?.name_fr || "Menu"}
                  </span>
                </div>
              </div>
              <CardContent className="p-4 sm:p-5">
                <CardTitle className="text-base sm:text-lg">{dish.name_fr}</CardTitle>
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
          <span className="font-medium">{t.featuredDishes.viewFullMenu}</span>
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </motion.div>
    </Section>
  );
}
