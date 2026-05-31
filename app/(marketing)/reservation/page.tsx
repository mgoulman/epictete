import type { Metadata } from "next";
import ReservationPageClient from "./ReservationPageClient";

export const metadata: Metadata = {
  title: "Réservation | Epictete Restaurant",
  description: "Réservez votre table chez Epictete Restaurant à Bouskoura. Réservation en ligne rapide avec confirmation. Ouvert 7j/7, 7h-22h.",
  openGraph: {
    title: "Réservation | Epictete Restaurant",
    description: "Réservez votre table chez Epictete Restaurant. Confirmation rapide par téléphone ou WhatsApp.",
  },
  alternates: { canonical: "/reservation" },
};

export default function ReservationPage() {
  return <ReservationPageClient />;
}
