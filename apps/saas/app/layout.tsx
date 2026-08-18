import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Epictète — Gestion de restaurant",
  description: "La plateforme tout-en-un pour piloter votre restaurant : caisse, stock, fournisseurs et équipe.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
