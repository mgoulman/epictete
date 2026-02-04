import type { Metadata } from "next";
import { Phone, Clock, MapPin, Navigation } from "lucide-react";
import { Section } from "@/components/layout/section";
import { ReservationForm } from "@/components/contact/reservation-form";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Réservation",
  description:
    "Réservez votre table chez Epictete Restaurant à Bouskoura. Réservation en ligne rapide avec confirmation. Ouvert 7j/7, 10h-22h.",
  openGraph: {
    title: "Réservation | Epictete Restaurant",
    description: "Réservez votre table chez Epictete Restaurant à Bouskoura. Confirmation rapide garantie.",
  },
};

export default function ReservationPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 md:pb-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-accent text-xs sm:text-sm font-medium uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-3 sm:mb-4">
            Réservation
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading font-semibold text-foreground leading-tight">
            Réservez votre table
          </h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Réservez en ligne et recevez une confirmation rapide par téléphone ou WhatsApp.
          </p>
        </div>
      </section>

      {/* Quick Call CTA - Mobile Priority */}
      <section className="bg-card py-6 sm:py-8 lg:hidden border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <a
            href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
            className="flex items-center justify-center gap-2 w-full py-4 bg-accent text-white rounded-xl font-medium"
          >
            <Phone size={18} />
            Appeler: {siteConfig.contact.phone}
          </a>
        </div>
      </section>

      {/* Reservation Form & Info */}
      <Section className="bg-primary">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Info Cards - Shows first on mobile */}
          <div className="order-1 lg:order-2 space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-heading font-semibold text-foreground mb-4 sm:mb-6">
                Informations pratiques
              </h2>
              <div className="space-y-4">
                {/* Hours Card */}
                <div className="flex gap-3 sm:gap-4 p-4 sm:p-5 bg-secondary rounded-xl">
                  <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground text-sm sm:text-base mb-1">Horaires</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      Tous les jours: {siteConfig.hours.daily}
                    </p>
                    <p className="text-sm text-accent mt-1">{siteConfig.hours.note}</p>
                  </div>
                </div>

                {/* Phone Card */}
                <div className="flex gap-3 sm:gap-4 p-4 sm:p-5 bg-secondary rounded-xl">
                  <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground text-sm sm:text-base mb-1">Téléphone</h3>
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

                {/* Address Card */}
                <div className="flex gap-3 sm:gap-4 p-4 sm:p-5 bg-secondary rounded-xl">
                  <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground text-sm sm:text-base mb-1">Adresse</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {siteConfig.contact.addressShort}
                    </p>
                    <p className="text-xs text-muted mt-1">Près de Carrefour Ouled Saleh</p>
                    <a
                      href={siteConfig.location.googleMapsDirections}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-sm text-accent hover:text-accent-hover transition-colors"
                    >
                      <Navigation size={14} />
                      Obtenir l&apos;itinéraire
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Note */}
            <div className="p-4 bg-accent/10 border border-accent/20 rounded-xl">
              <h3 className="font-medium text-foreground mb-2">Comment ça marche ?</h3>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li>1. Remplissez le formulaire avec vos informations</li>
                <li>2. Cliquez sur &quot;Envoyer ma réservation&quot;</li>
                <li>3. Nous recevons votre demande instantanément</li>
                <li>4. Nous vous confirmons par téléphone ou WhatsApp</li>
              </ol>
            </div>

            {/* Map */}
            <div className="relative aspect-video sm:aspect-4/3 rounded-2xl overflow-hidden border border-border">
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
            </div>
          </div>

          {/* Form */}
          <div className="order-2 lg:order-1">
            <ReservationForm />
          </div>
        </div>
      </Section>
    </>
  );
}
