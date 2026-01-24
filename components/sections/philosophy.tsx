"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Section } from "@/components/layout/section";

export function PhilosophySection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <Section id="philosophy" className="bg-secondary">
      <div ref={ref} className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-accent/30 mb-8">
            <span className="text-accent text-2xl font-heading">ε</span>
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-3xl md:text-4xl lg:text-5xl font-heading font-semibold text-foreground"
        >
          L&apos;art de bien manger
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-8 space-y-6 text-muted-foreground text-lg leading-relaxed"
        >
          <p>
            Chez Epictete, nous croyons que la gastronomie est une forme de 
            philosophie pratique. Chaque ingrédient est sélectionné avec soin, 
            chaque plat est une réflexion sur l&apos;harmonie des saveurs.
          </p>
          <p>
            Inspirés par la sagesse stoïcienne, nous cultivons l&apos;excellence 
            dans la simplicité, la qualité dans chaque détail, et le plaisir 
            dans chaque bouchée.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-12 flex justify-center gap-12"
        >
          {[
            { number: "10+", label: "Années d'expérience" },
            { number: "50+", label: "Créations uniques" },
            { number: "∞", label: "Passion" },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-heading text-accent font-semibold">
                {stat.number}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </Section>
  );
}
