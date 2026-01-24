import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Epictete Restaurant | Fine Dining à Bouskoura",
  description:
    "Découvrez Epictete, une expérience gastronomique unique inspirée de la philosophie stoïcienne. Réservez votre table à Bouskoura.",
  keywords: ["restaurant", "fine dining", "Bouskoura", "Casablanca", "gastronomie", "Epictete", "italien", "méditerranéen"],
  authors: [{ name: "Epictete Restaurant" }],
  openGraph: {
    title: "Epictete Restaurant | Fine Dining à Bouskoura",
    description:
      "Découvrez Epictete, une expérience gastronomique unique inspirée de la philosophie stoïcienne.",
    url: "https://epictetelerestaurant.ma",
    siteName: "Epictete Restaurant",
    locale: "fr_MA",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${playfair.variable} ${inter.variable} antialiased`}>
        <ThemeProvider defaultTheme="system" storageKey="epictete-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
