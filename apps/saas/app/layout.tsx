import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Epictète — Gestion de restaurant",
  description:
    "La plateforme pour piloter votre restaurant : caisse, stock, fournisseurs et équipe.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
