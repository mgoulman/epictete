import type { Metadata } from "next";
import { DigitalMenuClient } from "./DigitalMenuClient";

export const metadata: Metadata = {
  title: "Notre Carte | Epictete Restaurant",
  description: "Découvrez notre carte de cuisine italienne authentique. Antipasti, pâtes fraîches, pizzas napolitaines, viandes et poissons préparés avec des ingrédients frais de notre ferme biologique.",
  keywords: ["menu", "carte", "restaurant italien", "pizza", "pâtes", "Casablanca", "Bouskoura"],
};

export default function MenuPage() {
  return <DigitalMenuClient />;
}
