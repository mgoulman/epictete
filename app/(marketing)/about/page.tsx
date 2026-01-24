import type { Metadata } from "next";
import { Section, SectionHeader } from "@/components/layout/section";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "À Propos | Epictete Restaurant",
  description:
    "Découvrez l'histoire et la philosophie d'Epictete Restaurant, une expérience gastronomique unique à Marrakech.",
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative pt-32 pb-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-accent text-sm font-medium uppercase tracking-[0.3em] mb-4">
            Notre Histoire
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-semibold text-foreground">
            À Propos d&apos;Epictete
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Une philosophie du goût née de la passion pour l&apos;excellence culinaire 
            et la sagesse stoïcienne.
          </p>
        </div>
      </section>

      {/* Story */}
      <Section className="bg-primary">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-heading font-semibold text-foreground mb-6">
              Notre Philosophie
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Fondé sur les principes de la philosophie stoïcienne, Epictete Restaurant 
                incarne l&apos;art de vivre pleinement chaque instant. Notre nom rend hommage 
                à Épictète, le philosophe grec qui enseignait la maîtrise de soi et 
                l&apos;appréciation des choses simples.
              </p>
              <p>
                Dans notre cuisine, cette philosophie se traduit par une attention 
                méticuleuse aux détails, le respect des ingrédients et la recherche 
                constante de l&apos;harmonie des saveurs.
              </p>
              <p>
                Chaque plat est une méditation culinaire, préparé avec intention et 
                servi avec grâce, pour créer des moments de pure satisfaction.
              </p>
            </div>
          </div>
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-card border border-border">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto rounded-full border-2 border-accent/30 flex items-center justify-center mb-4">
                  <span className="text-accent text-4xl font-heading">ε</span>
                </div>
                <p className="text-muted-foreground text-sm">Image à venir</p>
              </div>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Excellence",
              description:
                "Nous recherchons la perfection dans chaque détail, de la sélection des ingrédients à la présentation finale.",
              icon: "✦",
            },
            {
              title: "Authenticité",
              description:
                "Nos recettes honorent la tradition marocaine tout en embrassant l'innovation culinaire contemporaine.",
              icon: "◈",
            },
            {
              title: "Hospitalité",
              description:
                "Chaque invité est accueilli comme un membre de la famille, avec chaleur et attention personnalisée.",
              icon: "❖",
            },
          ].map((value, index) => (
            <div
              key={index}
              className="text-center p-8 bg-card rounded-2xl border border-border hover:border-accent/50 transition-colors"
            >
              <div className="text-3xl text-accent mb-4">{value.icon}</div>
              <h3 className="text-xl font-heading font-semibold text-foreground mb-3">
                {value.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Chef */}
      <Section className="bg-primary">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 relative aspect-square rounded-2xl overflow-hidden bg-card border border-border">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-accent/10 flex items-center justify-center mb-4">
                  <span className="text-accent text-2xl">👨‍🍳</span>
                </div>
                <p className="text-muted-foreground text-sm">Photo du Chef</p>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-accent text-sm font-medium uppercase tracking-[0.2em] mb-3">
              Le Chef
            </p>
            <h2 className="text-3xl md:text-4xl font-heading font-semibold text-foreground mb-6">
              Une passion pour l&apos;art culinaire
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Notre chef exécutif apporte plus de 15 années d&apos;expérience dans 
                les plus grandes cuisines du monde. Formé dans les traditions 
                classiques françaises et marocaines, il crée des plats qui 
                racontent une histoire.
              </p>
              <p>
                &ldquo;La cuisine est un acte de générosité. Chaque plat que nous 
                servons est une invitation au voyage, une célébration des sens.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* CTA */}
      <section className="py-20 bg-card">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-semibold text-foreground mb-6">
            Venez découvrir notre univers
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Réservez votre table et laissez-nous vous guider dans une expérience 
            gastronomique inoubliable.
          </p>
          <Button size="lg">Réserver une table</Button>
        </div>
      </section>
    </>
  );
}
