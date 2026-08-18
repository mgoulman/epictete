"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { MapPin, Clock, Phone, Navigation, Car } from "lucide-react";
import { Section, SectionHeader } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useSiteContent } from "@/lib/hooks/useSiteContent";

export function LocationSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const { t } = useTranslation();
  const { getSectionText } = useSiteContent();
  const s = (key: string, fallback: string) => getSectionText('location', key, fallback);

  return (
    <Section id="location" className="bg-primary">
      <SectionHeader
        eyebrow={s('eyebrow', t.location.eyebrow)}
        title={s('title', t.location.title)}
        description={s('description', t.location.description)}
      />

      <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-stretch">
        {/* Map */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="relative aspect-video md:aspect-auto md:min-h-[400px] rounded-2xl overflow-hidden border border-border"
        >
          <iframe
            src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${siteConfig.location.googleMapsQuery}&zoom=15`}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={t.location.mapTitle}
            className="grayscale hover:grayscale-0 transition-all duration-500"
          />
          {/* Mobile Directions Button Overlay */}
          <div className="absolute bottom-4 left-4 right-4 md:hidden">
            <Button className="w-full" asChild>
              <a
                href={siteConfig.location.googleMapsDirections}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation size={16} className="mr-2" />
                {t.location.directions}
              </a>
            </Button>
          </div>
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-5 sm:space-y-6"
        >
          {/* Address Card */}
          <div className="flex gap-3 sm:gap-4 p-4 sm:p-5 bg-secondary rounded-xl">
            <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-semibold text-foreground text-base sm:text-lg mb-1">
                {t.location.address}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {siteConfig.contact.addressShort}
              </p>
              <p className="text-xs text-muted mt-1">
                {t.location.addressNote}
              </p>
              <a
                href={siteConfig.location.googleMapsDirections}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1 mt-2 text-sm text-accent hover:text-accent-hover transition-colors"
              >
                <Navigation size={14} />
                {t.location.directions}
              </a>
            </div>
          </div>

          {/* Hours Card */}
          <div className="flex gap-3 sm:gap-4 p-4 sm:p-5 bg-secondary rounded-xl">
            <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 flex items-center justify-center">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading font-semibold text-foreground text-base sm:text-lg mb-1">
                {t.location.hoursLabel}
              </h3>
              <div className="text-sm sm:text-base text-muted-foreground space-y-1">
                <p>
                  <span className="text-foreground">{t.location.daily}</span> {siteConfig.hours.daily}
                </p>
                <p className="text-accent text-sm">{t.footer.serviceNote}</p>
              </div>
            </div>
          </div>

          {/* Phone Card */}
          <div className="flex gap-3 sm:gap-4 p-4 sm:p-5 bg-secondary rounded-xl">
            <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 flex items-center justify-center">
              <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading font-semibold text-foreground text-base sm:text-lg mb-1">
                {t.location.reservations}
              </h3>
              <div className="space-y-1">
                <a
                  href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
                  className="block text-sm sm:text-base text-muted-foreground hover:text-accent transition-colors"
                >
                  {siteConfig.contact.phone}
                </a>
                <a
                  href={`tel:${siteConfig.contact.phoneSecondary.replace(/\s/g, "")}`}
                  className="block text-sm sm:text-base text-muted-foreground hover:text-accent transition-colors"
                >
                  {siteConfig.contact.phoneSecondary}
                </a>
              </div>
            </div>
          </div>

          {/* Parking Note */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground px-1">
            <Car size={14} className="text-accent shrink-0" />
            <span>{t.location.parking}</span>
          </div>
        </motion.div>
      </div>
    </Section>
  );
}
