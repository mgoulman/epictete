"use client";

import Image from "next/image";
import Link from "next/link";
import { Leaf, Flame, Heart, Phone, MapPin, Clock } from "lucide-react";
import { Section, SectionHeader } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function AboutPageClient() {
  const { t } = useTranslation();
  const p = (t as Record<string, unknown>).aboutPage as Record<string, string>;

  const values = [
    { icon: Leaf, title: p.valueBioTitle, description: p.valueBioDesc },
    { icon: Flame, title: p.valueTraditionTitle, description: p.valueTraditionDesc },
    { icon: Heart, title: p.valuePassionTitle, description: p.valuePassionDesc },
  ];

  return (
    <>
      <section className="relative pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 md:pb-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-accent text-xs sm:text-sm font-medium uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-3 sm:mb-4">{p.eyebrow}</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading font-semibold text-foreground leading-tight">{p.title}</h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">{p.subtitle}</p>
        </div>
      </section>

      <Section className="bg-primary">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
          <div className="order-2 lg:order-1">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-semibold text-foreground mb-4 sm:mb-6">{p.philosophyTitle}</h2>
            <div className="space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
              <p dangerouslySetInnerHTML={{ __html: p.philosophyP1 }} />
              <p dangerouslySetInnerHTML={{ __html: p.philosophyP2 }} />
              <p dangerouslySetInnerHTML={{ __html: p.philosophyP3 }} />
            </div>
          </div>
          <div className="order-1 lg:order-2 relative aspect-4/3 sm:aspect-square rounded-2xl overflow-hidden bg-card border border-border">
            <Image src="/images/restaurant/main-hall.png" alt={p.mainHallDesc} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
            <div className="absolute inset-0 bg-linear-to-t from-primary/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
              <p className="text-xs sm:text-sm text-muted-foreground">{p.mainHallCaption}</p>
              <p className="text-sm sm:text-base font-heading text-foreground">{p.mainHallDesc}</p>
            </div>
          </div>
        </div>
      </Section>

      <Section className="bg-secondary">
        <SectionHeader eyebrow={p.valuesEyebrow} title={p.valuesTitle} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {values.map((value, index) => (
            <div key={index} className="flex sm:flex-col items-start sm:items-center gap-4 sm:gap-0 p-5 sm:p-6 md:p-8 bg-card rounded-2xl border border-border hover:border-accent/50 transition-colors">
              <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-accent/10 flex items-center justify-center sm:mb-4">
                <value.icon className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
              </div>
              <div className="sm:text-center">
                <h3 className="text-lg sm:text-xl font-heading font-semibold text-foreground mb-2 sm:mb-3">{value.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section className="bg-primary">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
          <div className="relative aspect-4/3 sm:aspect-square rounded-2xl overflow-hidden bg-card border border-border">
            <Image src="/images/restaurant/bar-area.png" alt={p.barDesc} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
            <div className="absolute inset-0 bg-linear-to-t from-primary/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
              <p className="text-xs sm:text-sm text-muted-foreground">{p.barCaption}</p>
              <p className="text-sm sm:text-base font-heading text-foreground">{p.barDesc}</p>
            </div>
          </div>
          <div>
            <p className="text-accent text-xs sm:text-sm font-medium uppercase tracking-[0.2em] mb-2 sm:mb-3">{p.cuisineEyebrow}</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-semibold text-foreground mb-4 sm:mb-6">{p.cuisineTitle}</h2>
            <div className="space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
              <p>{p.cuisineP1}</p>
              <ul className="space-y-2">
                {[p.cuisinePizza, p.cuisinePasta, p.cuisineMeat, p.cuisineDessert].map((item, i) => (
                  <li key={i} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" /><span>{item}</span></li>
                ))}
              </ul>
            </div>
            <div className="mt-6"><Button asChild><Link href="/menu">{p.discoverMenu}</Link></Button></div>
          </div>
        </div>
      </Section>

      <section className="py-12 sm:py-16 md:py-20 bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-semibold text-foreground mb-4 sm:mb-6">{p.ctaTitle}</h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">{p.ctaSubtitle}</p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-6 sm:mb-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Clock size={16} className="text-accent" /><span>{siteConfig.hours.daily}</span></div>
            <div className="flex items-center gap-2"><MapPin size={16} className="text-accent" /><span>Bouskoura Sud</span></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button size="lg" className="w-full sm:w-auto" asChild><a href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}><Phone size={18} className="mr-2" />{p.reserve}: {siteConfig.contact.phone}</a></Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild><Link href="/contact">{p.contactUs}</Link></Button>
          </div>
        </div>
      </section>
    </>
  );
}
