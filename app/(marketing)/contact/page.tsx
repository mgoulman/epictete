import type { Metadata } from "next";
import { MapPin, Phone, Clock, Instagram, Navigation, Car } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contactez Epictete Restaurant à Bouskoura pour réserver votre table. Téléphone: 06 70 69 93 93. Ouvert 7j/7, 10h-22h.",
  openGraph: {
    title: "Contact | Epictete Restaurant",
    description: "Réservez votre table chez Epictete Restaurant à Bouskoura. Téléphone: 06 70 69 93 93",
  },
};

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 md:pb-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-accent text-xs sm:text-sm font-medium uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-3 sm:mb-4">
            Contact
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading font-semibold text-foreground leading-tight">
            Contactez-nous
          </h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Pour réserver ou pour toute question, nous sommes à votre écoute.
          </p>
        </div>
      </section>

      {/* Quick Call CTA - Mobile Priority */}
      <section className="bg-card py-6 sm:py-8 lg:hidden border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" className="flex-1 py-4" asChild>
              <a href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}>
                <Phone size={18} className="mr-2" />
                Appeler: {siteConfig.contact.phone}
              </a>
            </Button>
            <Button variant="outline" size="lg" className="flex-1 py-4" asChild>
              <a
                href={siteConfig.location.googleMapsDirections}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation size={18} className="mr-2" />
                Itinéraire
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <Section className="bg-primary">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Contact Info - Shows first on mobile */}
          <div className="order-1 lg:order-2 space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-heading font-semibold text-foreground mb-4 sm:mb-6">
                Informations
              </h2>
              <div className="space-y-4">
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

                {/* Social & Email */}
                <div className="flex gap-3 sm:gap-4 p-4 sm:p-5 bg-secondary rounded-xl">
                  <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <Instagram className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground text-sm sm:text-base mb-1">Réseaux sociaux</h3>
                    <a
                      href={siteConfig.social.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm sm:text-base text-muted-foreground hover:text-accent transition-colors"
                    >
                      @epictete.restaurant
                    </a>
                    <a
                      href={`mailto:${siteConfig.contact.email}`}
                      className="block text-sm text-muted-foreground hover:text-accent transition-colors mt-1"
                    >
                      {siteConfig.contact.email}
                    </a>
                  </div>
                </div>

                {/* Parking Note */}
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground px-1">
                  <Car size={14} className="text-accent shrink-0" />
                  <span>Parking disponible sur place</span>
                </div>
              </div>
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
          <div className="order-2 lg:order-1 bg-card rounded-2xl border border-border p-5 sm:p-6 md:p-8">
            <h2 className="text-xl sm:text-2xl font-heading font-semibold text-foreground mb-4 sm:mb-6">
              Envoyez-nous un message
            </h2>
            <form className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Nom complet
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors text-base"
                    placeholder="Votre nom"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors text-base"
                    placeholder="votre@email.com"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Téléphone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors text-base"
                  placeholder="+212 6XX XX XX XX"
                />
              </div>
              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Sujet
                </label>
                <select
                  id="subject"
                  name="subject"
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:border-accent transition-colors text-base"
                >
                  <option value="reservation">Réservation</option>
                  <option value="event">Événement privé</option>
                  <option value="feedback">Commentaire</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  required
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors resize-none text-base"
                  placeholder="Votre message..."
                />
              </div>
              <Button type="submit" className="w-full py-4 text-base">
                Envoyer le message
              </Button>
            </form>

            {/* Quick Call Alternative */}
            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Pour une réservation rapide, appelez-nous directement
              </p>
              <a
                href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-2 text-accent hover:text-accent-hover transition-colors font-medium"
              >
                <Phone size={16} />
                {siteConfig.contact.phone}
              </a>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
