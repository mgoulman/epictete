"use client";

import { Phone, Clock, MapPin, Navigation } from "lucide-react";
import { Section } from "@/components/layout/section";
import { ReservationForm } from "@/components/contact/reservation-form";
import { siteConfig } from "@/config/site";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function ReservationPageClient() {
  const { t } = useTranslation();
  const p = (t as Record<string, unknown>).reservationPage as Record<string, string>;

  return (
    <>
      <section className="relative pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 md:pb-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-accent text-xs sm:text-sm font-medium uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-3 sm:mb-4">{p.eyebrow}</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading font-semibold text-foreground leading-tight">{p.title}</h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">{p.subtitle}</p>
        </div>
      </section>
      <Section className="bg-primary">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="order-2 lg:order-2 space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-heading font-semibold text-foreground mb-4 sm:mb-6">{p.practicalInfo}</h2>
              <div className="space-y-4">
                <div className="flex gap-3 sm:gap-4 p-4 sm:p-5 bg-secondary rounded-xl">
                  <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 flex items-center justify-center"><Clock className="w-4 h-4 sm:w-5 sm:h-5 text-accent" /></div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground text-sm sm:text-base mb-1">{p.hours}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">{p.everyDay}: {siteConfig.hours.daily}</p>
                    <p className="text-sm text-accent mt-1">{siteConfig.hours.note}</p>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4 p-4 sm:p-5 bg-secondary rounded-xl">
                  <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 flex items-center justify-center"><Phone className="w-4 h-4 sm:w-5 sm:h-5 text-accent" /></div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground text-sm sm:text-base mb-1">{p.phone}</h3>
                    <a href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`} className="block text-sm sm:text-base text-muted-foreground hover:text-accent transition-colors">{siteConfig.contact.phone}</a>
                    <a href={`tel:${siteConfig.contact.phoneSecondary.replace(/\s/g, "")}`} className="block text-sm sm:text-base text-muted-foreground hover:text-accent transition-colors">{siteConfig.contact.phoneSecondary}</a>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4 p-4 sm:p-5 bg-secondary rounded-xl">
                  <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 flex items-center justify-center"><MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-accent" /></div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground text-sm sm:text-base mb-1">{p.address}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">{siteConfig.contact.addressShort}</p>
                    <p className="text-xs text-muted mt-1">{p.addressNote}</p>
                    <a href={siteConfig.location.googleMapsDirections} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-sm text-accent hover:text-accent-hover transition-colors"><Navigation size={14} />{p.getDirections}</a>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-accent/10 border border-accent/20 rounded-xl">
              <h3 className="font-medium text-foreground mb-2">{p.howItWorks}</h3>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li>1. {p.step1}</li>
                <li>2. {p.step2}</li>
                <li>3. {p.step3}</li>
                <li>4. {p.step4}</li>
              </ol>
            </div>
            <div className="relative aspect-video sm:aspect-4/3 rounded-2xl overflow-hidden border border-border">
              <iframe src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${siteConfig.location.googleMapsQuery}&zoom=15`} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Epictete Restaurant" className="grayscale hover:grayscale-0 transition-all duration-500" />
            </div>
          </div>
          <div className="order-1 lg:order-1"><ReservationForm /></div>
        </div>
      </Section>
    </>
  );
}
