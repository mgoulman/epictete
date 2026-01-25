import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Leaf, Flame, Heart, Phone, MapPin, Clock } from "lucide-react";
import { Section, SectionHeader } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "À Propos",
  description:
    "Découvrez l'histoire et la philosophie d'Epictete Restaurant à Bouskoura. Cuisine italienne gastronomique inspirée de la sagesse stoïcienne, produits bio de notre ferme.",
  openGraph: {
    title: "À Propos | Epictete Restaurant",
    description: "L'histoire et la philosophie d'Epictete Restaurant - Fine Dining Italien à Bouskoura",
  },
};

export default function AboutPage() {
  const values = [
    {
      icon: Leaf,
      title: "Bio & Local",
      description:
        "Produits frais de notre propre ferme biologique. Des ingrédients de qualité pour une cuisine authentique.",
    },
    {
      icon: Flame,
      title: "Tradition",
      description:
        "Four à bois napolitain pour nos pizzas, techniques italiennes classiques pour nos pâtes fraîches maison.",
    },
    {
      icon: Heart,
      title: "Passion",
      description:
        "Chaque plat est préparé avec amour et attention. L'excellence dans chaque détail, de la cuisine au service.",
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 md:pb-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-accent text-xs sm:text-sm font-medium uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-3 sm:mb-4">
            Notre Histoire
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading font-semibold text-foreground leading-tight">
            À Propos d&apos;Epictete
          </h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Une philosophie du goût née de la passion pour l&apos;excellence culinaire 
            et la sagesse stoïcienne.
          </p>
        </div>
      </section>

      {/* Story */}
      <Section className="bg-primary">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
          <div className="order-2 lg:order-1">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-semibold text-foreground mb-4 sm:mb-6">
              Notre Philosophie
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
              <p>
                <strong className="text-foreground">Epictete</strong> tire son nom d&apos;Épictète, 
                le philosophe stoïcien grec (50-135 ap. J.-C.) qui enseignait l&apos;art de 
                vivre pleinement chaque instant et de faire des choix intentionnels.
              </p>
              <p>
                Notre tagline <span className="text-accent italic">&ldquo;Savoure chaque instant, 
                maîtrise chaque choix&rdquo;</span> traduit cette philosophie dans l&apos;univers 
                culinaire : être présent, apprécier chaque bouchée, et choisir la qualité.
              </p>
              <p>
                Ouvert en <strong className="text-foreground">octobre 2025</strong>, notre restaurant 
                à Bouskoura Sud propose une cuisine italienne et méditerranéenne gastronomique, 
                avec des produits biologiques cultivés dans notre propre ferme.
              </p>
            </div>
          </div>
          <div className="order-1 lg:order-2 relative aspect-4/3 sm:aspect-square rounded-2xl overflow-hidden bg-card border border-border">
            <Image
              src="/images/restaurant/main-hall.png"
              alt="Intérieur du restaurant Epictete - Salle principale avec décor Art Déco"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-linear-to-t from-primary/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
              <p className="text-xs sm:text-sm text-muted-foreground">Notre salle principale</p>
              <p className="text-sm sm:text-base font-heading text-foreground">Un cadre Art Déco méditerranéen</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Values */}
      <Section className="bg-secondary">
        <SectionHeader
          eyebrow="Nos Valeurs"
          title="Ce qui nous guide"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {values.map((value, index) => (
            <div
              key={index}
              className="flex sm:flex-col items-start sm:items-center gap-4 sm:gap-0 p-5 sm:p-6 md:p-8 bg-card rounded-2xl border border-border hover:border-accent/50 transition-colors"
            >
              <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-accent/10 flex items-center justify-center sm:mb-4">
                <value.icon className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
              </div>
              <div className="sm:text-center">
                <h3 className="text-lg sm:text-xl font-heading font-semibold text-foreground mb-2 sm:mb-3">
                  {value.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Cuisine */}
      <Section className="bg-primary">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
          <div className="relative aspect-4/3 sm:aspect-square rounded-2xl overflow-hidden bg-card border border-border">
            <Image
              src="/images/restaurant/bar-area.png"
              alt="Bar du restaurant Epictete avec finitions dorées"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-linear-to-t from-primary/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
              <p className="text-xs sm:text-sm text-muted-foreground">Notre bar</p>
              <p className="text-sm sm:text-base font-heading text-foreground">Cocktails & mocktails signature</p>
            </div>
          </div>
          <div>
            <p className="text-accent text-xs sm:text-sm font-medium uppercase tracking-[0.2em] mb-2 sm:mb-3">
              Notre Cuisine
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-semibold text-foreground mb-4 sm:mb-6">
              Italienne & Méditerranéenne
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
              <p>
                Notre carte met en avant le meilleur de la cuisine italienne avec une 
                touche méditerranéenne contemporaine. Chaque plat est préparé avec des 
                ingrédients frais, dont beaucoup proviennent de notre propre ferme biologique.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span><strong className="text-foreground">Pizzas</strong> cuites au four à bois napolitain</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span><strong className="text-foreground">Pâtes</strong> fraîches faites maison chaque jour</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span><strong className="text-foreground">Viandes & poissons</strong> sélectionnés avec soin</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span><strong className="text-foreground">Desserts</strong> italiens classiques revisités</span>
                </li>
              </ul>
            </div>
            <div className="mt-6">
              <Button asChild>
                <Link href="/menu">Découvrir notre carte</Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* CTA */}
      <section className="py-12 sm:py-16 md:py-20 bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-semibold text-foreground mb-4 sm:mb-6">
            Venez découvrir notre univers
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
            Réservez votre table et laissez-nous vous guider dans une expérience 
            gastronomique méditerranéenne inoubliable.
          </p>
          
          {/* Quick Info */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-6 sm:mb-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-accent" />
              <span>{siteConfig.hours.daily}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-accent" />
              <span>Bouskoura Sud</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <a href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}>
                <Phone size={18} className="mr-2" />
                Réserver: {siteConfig.contact.phone}
              </a>
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
              <Link href="/contact">Nous contacter</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
