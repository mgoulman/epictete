"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section className="relative py-16 sm:py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-card">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-accent)/0.1,transparent_70%)]" />
      </div>

      {/* Content */}
      <div ref={ref} className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <p className="text-accent text-xs sm:text-sm font-medium uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-3 sm:mb-4">
            Réservation
          </p>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-heading font-semibold text-foreground leading-tight"
        >
          Prêt à vivre l&apos;expérience
          <br />
          <span className="text-accent">Epictete ?</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto"
        >
          Réservez votre table dès maintenant et laissez-nous vous guider dans 
          un voyage culinaire méditerranéen inoubliable.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0"
        >
          <Button size="lg" className="w-full sm:w-auto text-base py-4 sm:py-3.5" asChild>
            <a href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}>
              <Phone size={18} className="mr-2" />
              Réserver maintenant
            </a>
          </Button>
          <Button variant="outline" size="lg" className="w-full sm:w-auto text-base py-4 sm:py-3.5" asChild>
            <Link href="/contact">
              <MessageCircle size={18} className="mr-2" />
              Nous contacter
            </Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm text-muted-foreground"
        >
          <a 
            href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
            className="hover:text-accent transition-colors"
          >
            <span className="text-accent">{siteConfig.contact.phone}</span>
          </a>
          <span className="hidden sm:inline">•</span>
          <a 
            href={`tel:${siteConfig.contact.phoneSecondary.replace(/\s/g, "")}`}
            className="hover:text-accent transition-colors"
          >
            <span className="text-accent">{siteConfig.contact.phoneSecondary}</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
