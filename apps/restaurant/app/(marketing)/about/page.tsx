import type { Metadata } from "next";
import AboutPageClient from "./AboutPageClient";

export const metadata: Metadata = {
  title: "À Propos | Epictete Restaurant",
  description: "Découvrez l'histoire et la philosophie d'Epictete Restaurant à Bouskoura. Cuisine italienne gastronomique inspirée de la sagesse stoïcienne, produits bio de notre ferme.",
  openGraph: {
    title: "À Propos | Epictete Restaurant",
    description: "L'histoire et la philosophie d'Epictete Restaurant — Fine Dining Italien à Bouskoura Sud, Casablanca.",
  },
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <AboutPageClient />;
}
