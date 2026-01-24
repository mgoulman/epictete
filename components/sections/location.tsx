"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { MapPin, Clock, Phone } from "lucide-react";
import { Section, SectionHeader } from "@/components/layout/section";
import { siteConfig } from "@/config/site";

export function LocationSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <Section id="location" className="bg-primary">
      <SectionHeader
        eyebrow="Nous Trouver"
        title="Venez nous rendre visite"
        description="Situé à Bouskoura Sud, aux portes de Casablanca, Epictete vous accueille dans un cadre élégant et raffiné."
      />

      <div ref={ref} className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Map */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="relative aspect-video lg:aspect-square rounded-2xl overflow-hidden border border-border"
        >
          <iframe
            src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${siteConfig.location.googleMapsQuery}&zoom=15`}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Location de Epictete Restaurant - Bouskoura Sud, Casablanca"
            className="grayscale hover:grayscale-0 transition-all duration-500"
          />
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-8"
        >
          {/* Address */}
          <div className="flex gap-4">
            <div className="shrink-0 w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground text-lg mb-1">
                Adresse
              </h3>
              <p className="text-muted-foreground">
                {siteConfig.contact.address}
              </p>
              <a
                href={siteConfig.location.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-sm text-accent hover:text-accent-hover transition-colors"
              >
                Obtenir l&apos;itinéraire →
              </a>
            </div>
          </div>

          {/* Hours */}
          <div className="flex gap-4">
            <div className="shrink-0 w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground text-lg mb-1">
                Horaires
              </h3>
              <ul className="text-muted-foreground space-y-1">
                <li>
                  <span className="text-foreground">Tous les jours:</span> {siteConfig.hours.daily}
                </li>
                <li className="text-accent">{siteConfig.hours.note}</li>
              </ul>
            </div>
          </div>

          {/* Phone */}
          <div className="flex gap-4">
            <div className="shrink-0 w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
              <Phone className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground text-lg mb-1">
                Réservations
              </h3>
              <a
                href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
                className="text-muted-foreground hover:text-accent transition-colors"
              >
                {siteConfig.contact.phone}
              </a>
              <p className="text-sm text-muted mt-1">
                Nous recommandons de réserver à l&apos;avance
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  );
}
