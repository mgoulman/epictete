"use client";

import { motion } from "framer-motion";
import { ChevronDown, Phone, Clock, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export function HeroSection() {
  const scrollToNext = () => {
    const nextSection = document.getElementById("philosophy");
    nextSection?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-svh flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/images/restaurant/main-hall.png"
          alt="Intérieur élégant du restaurant Epictete à Bouskoura - décor Art Déco méditerranéen avec banquettes velours olive et éclairage globe doré"
          fill
          className="object-cover object-center"
          priority
          quality={85}
          sizes="100vw"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-primary/70" />
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-linear-to-t from-primary via-primary/40 to-primary/20" />
        {/* Gold accent glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,169,98,0.15)_0%,transparent_60%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-24 sm:pb-28 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <p className="text-accent text-xs sm:text-sm md:text-base font-medium uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-4 sm:mb-6">
            Bienvenue chez Epictete
          </p>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-heading font-semibold text-foreground leading-[1.1] sm:leading-tight"
        >
          Une philosophie
          <br />
          <span className="text-accent">du goût</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-5 sm:mt-8 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-2"
        >
          Cuisine italienne et méditerranéenne gastronomique. Pizza au feu de bois, 
          pâtes fraîches maison, produits bio de notre ferme.
        </motion.p>

        {/* Quick Info Pills - Mobile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:hidden"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 backdrop-blur-sm text-xs text-muted-foreground">
            <Clock size={12} className="text-accent" />
            {siteConfig.hours.daily}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 backdrop-blur-sm text-xs text-muted-foreground">
            <MapPin size={12} className="text-accent" />
            Bouskoura Sud
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0"
        >
          <Button size="lg" className="w-full sm:w-auto text-base py-4 sm:py-3.5" asChild>
            <a href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}>
              <Phone size={18} className="mr-2" />
              Réserver une table
            </a>
          </Button>
          <Button variant="outline" size="lg" className="w-full sm:w-auto text-base py-4 sm:py-3.5" asChild>
            <Link href="/menu">
              Découvrir le menu
            </Link>
          </Button>
        </motion.div>

        {/* Quick Info - Desktop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="hidden md:flex items-center justify-center gap-8 mt-12 text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-accent" />
            <span>Ouvert 7j/7 · {siteConfig.hours.daily}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-accent" />
            <span>Bouskoura Sud, Casablanca</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <a 
            href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
            className="flex items-center gap-2 hover:text-accent transition-colors"
          >
            <Phone size={16} className="text-accent" />
            <span>{siteConfig.contact.phone}</span>
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.2 }}
        onClick={scrollToNext}
        className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 text-muted-foreground hover:text-accent transition-colors p-2 touch-manipulation"
        aria-label="Défiler vers la section suivante"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown size={28} className="sm:w-8 sm:h-8" />
        </motion.div>
      </motion.button>
    </section>
  );
}
