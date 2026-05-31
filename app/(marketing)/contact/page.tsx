import type { Metadata } from "next";
import ContactPageClient from "./ContactPageClient";

export const metadata: Metadata = {
  title: "Contact | Epictete Restaurant",
  description: "Contactez Epictete Restaurant à Bouskoura pour réserver votre table. Téléphone: 06 70 69 93 93. Ouvert 7j/7, 7h-22h.",
  openGraph: {
    title: "Contact | Epictete Restaurant",
    description: "Contactez Epictete Restaurant. Fine dining italien et méditerranéen à Bouskoura Sud, Casablanca.",
  },
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
