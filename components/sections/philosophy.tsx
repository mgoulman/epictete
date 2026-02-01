"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Leaf, Flame, Heart } from "lucide-react";
import { Section } from "@/components/layout/section";

export function PhilosophySection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const features = [
    {
      icon: Leaf,
      title: "Bio de notre ferme",
      description: "Produits frais et biologiques cultivés dans notre propre ferme",
    },
    {
      icon: Flame,
      title: "Four à bois",
      description: "Pizzas cuites au feu de bois traditionnel napolitain",
    },
    {
      icon: Heart,
      title: "Fait maison",
      description: "Pâtes fraîches et sauces préparées chaque jour",
    },
  ];

  return (
    <Section id="philosophy" className="bg-secondary">
      <div ref={ref} className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-accent/30 mb-6 sm:mb-8">
              <span className="text-accent text-xl sm:text-2xl font-heading">ε</span>
            </div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-heading font-semibold text-foreground"
          >
            Savoure chaque instant,
            <br className="hidden sm:block" />
            <span className="text-accent"> maîtrise chaque choix</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            Inspirés par la philosophie stoïcienne d&apos;Épictète, nous créons une 
            expérience où chaque plat est une célébration des saveurs méditerranéennes.
          </motion.p>
        </div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-16"
        >
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex sm:flex-col items-center sm:items-center gap-4 sm:gap-0 p-4 sm:p-6 bg-card rounded-2xl border border-border hover:border-accent/30 transition-colors"
            >
              <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-accent/10 flex items-center justify-center sm:mb-4">
                <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
              </div>
              <div className="sm:text-center">
                <h3 className="font-heading font-semibold text-foreground text-base sm:text-lg">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-6 sm:gap-8 md:gap-12"
        >
          {[
            { number: "2025", label: "Ouverture" },
            { number: "7j/7", label: "À votre service" },
            { number: "100%", label: "Passion" },
          ].map((stat, index) => (
            <div key={index} className="text-center min-w-[80px]">
              <div className="text-2xl sm:text-3xl md:text-4xl font-heading text-accent font-semibold">
                {stat.number}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </Section>
  );
}
