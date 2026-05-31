"use client";

import { MapPin, Phone, Clock, Instagram, Navigation, Car } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { ContactForm } from "@/components/contact/contact-form";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function ContactPageClient() {
  const { t } = useTranslation();
  const p = (t as Record<string, unknown>).contactPage as Record<string, string>;

  return (
    <>
      <section className="relative pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 md:pb-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-accent text-xs sm:text-sm font-medium uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-3 sm:mb-4">{p.eyebrow}</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading font-semibold text-foreground leading-tight">{p.title}</h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">{p.subtitle}</p>
        </div>
      </section>
      <section className="bg-card py-6 sm:py-8 lg:hidden border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" className="flex-1 py-4" asChild><a href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}><Phone size={18} className="mr-2" />{p.call}: {siteConfig.contact.phone}</a></Button>
            <Button variant="outline" size="lg" className="flex-1 py-4" asChild><a href={siteConfig.location.googleMapsDirections} target="_blank" rel="noopener noreferrer"><Navigation size={18} className="mr-2" />{p.directions}</a></Button>
          </div>
        </div>
      </section>
      <Section className="bg-primary">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="order-1 lg:order-2 space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-heading font-semibold text-foreground mb-4 sm:mb-6">{p.info}</h2>
              <div className="space-y-4">
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
                <div className="flex gap-3 sm:gap-4 p-4 sm:p-5 bg-secondary rounded-xl">
                  <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 flex items-center justify-center"><Clock className="w-4 h-4 sm:w-5 sm:h-5 text-accent" /></div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground text-sm sm:text-base mb-1">{p.hours}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">{p.everyDay}: {siteConfig.hours.daily}</p>
                    <p className="text-sm text-accent mt-1">{siteConfig.hours.note}</p>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4 p-4 sm:p-5 bg-secondary rounded-xl">
                  <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 flex items-center justify-center"><Instagram className="w-4 h-4 sm:w-5 sm:h-5 text-accent" /></div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground text-sm sm:text-base mb-1">{p.social}</h3>
                    <a href={siteConfig.social.instagram} target="_blank" rel="noopener noreferrer" className="block text-sm sm:text-base text-muted-foreground hover:text-accent transition-colors">@epictete.restaurant</a>
                    <a href={`mailto:${siteConfig.contact.email}`} className="block text-sm text-muted-foreground hover:text-accent transition-colors mt-1">{siteConfig.contact.email}</a>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground px-1"><Car size={14} className="text-accent shrink-0" /><span>{p.parking}</span></div>
              </div>
            </div>
            <div className="relative aspect-video sm:aspect-4/3 rounded-2xl overflow-hidden border border-border">
              <iframe src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${siteConfig.location.googleMapsQuery}&zoom=15`} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Epictete Restaurant" className="grayscale hover:grayscale-0 transition-all duration-500" />
            </div>
          </div>
          <div className="order-2 lg:order-1"><ContactForm /></div>
        </div>
      </Section>
    </>
  );
}
