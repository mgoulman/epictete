import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { siteConfig } from "@/config/site";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Epictete Restaurant | Fine Dining Italien & Méditerranéen à Bouskoura",
    template: "%s | Epictete Restaurant",
  },
  description:
    "Découvrez Epictete, restaurant gastronomique italien et méditerranéen à Bouskoura, Casablanca. Pizza au feu de bois, pâtes fraîches maison, produits bio de notre ferme. Réservez au 06 70 69 93 93.",
  keywords: [
    "restaurant Bouskoura",
    "fine dining Casablanca",
    "restaurant italien Maroc",
    "cuisine méditerranéenne",
    "Epictete restaurant",
    "pizza feu de bois",
    "pâtes fraîches maison",
    "restaurant gastronomique Casablanca",
    "bio ferme restaurant",
    "restaurant Bouskoura Sud",
    "réservation restaurant Casablanca",
    "meilleur restaurant Bouskoura",
  ],
  authors: [{ name: "Epictete Restaurant", url: siteConfig.url }],
  creator: "Epictete Restaurant",
  publisher: "Epictete Restaurant",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: siteConfig.url,
    languages: {
      "fr-MA": siteConfig.url,
      "fr": siteConfig.url,
    },
  },
  openGraph: {
    type: "website",
    locale: "fr_MA",
    url: siteConfig.url,
    siteName: "Epictete Restaurant",
    title: "Epictete Restaurant | Fine Dining Italien & Méditerranéen à Bouskoura",
    description:
      "Restaurant gastronomique italien et méditerranéen à Bouskoura. Pizza au feu de bois, pâtes fraîches, produits bio. Ouvert 7j/7, 10h-22h.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Epictete Restaurant - Intérieur élégant avec décor Art Déco méditerranéen",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Epictete Restaurant | Fine Dining à Bouskoura",
    description:
      "Restaurant gastronomique italien et méditerranéen. Pizza au feu de bois, pâtes fraîches maison. Réservez votre table.",
    images: ["/og-image.jpg"],
    creator: "@epictete.restaurant",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
  category: "restaurant",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Restaurant",
      "@id": `${siteConfig.url}/#restaurant`,
      name: "Epictete Restaurant",
      alternateName: "Épictète le Restaurant",
      description:
        "Restaurant gastronomique italien et méditerranéen à Bouskoura, inspiré de la philosophie stoïcienne. Pizza au feu de bois, pâtes fraîches maison, produits bio de notre ferme.",
      url: siteConfig.url,
      telephone: [siteConfig.contact.phone, siteConfig.contact.phoneSecondary],
      email: siteConfig.contact.email,
      address: {
        "@type": "PostalAddress",
        streetAddress: "COMMUNE OULED SALEH, lot 62E3, Lotissement AL KHAIR OULED SALEH",
        addressLocality: "Bouskoura",
        addressRegion: "Casablanca-Settat",
        postalCode: "27184",
        addressCountry: "MA",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: siteConfig.location.lat,
        longitude: siteConfig.location.lng,
      },
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ],
          opens: "10:00",
          closes: "22:00",
        },
      ],
      servesCuisine: ["Italian", "Mediterranean", "Pizza", "Pasta"],
      priceRange: "$$-$$$",
      acceptsReservations: true,
      menu: "https://menu.epictetelerestaurant.ma",
      hasMenu: {
        "@type": "Menu",
        name: "Carte Epictete",
        description: "Cuisine italienne gastronomique avec pizzas au feu de bois et pâtes fraîches maison",
        url: "https://menu.epictetelerestaurant.ma",
      },
      image: [
        `${siteConfig.url}/images/restaurant/main-hall.png`,
        `${siteConfig.url}/images/restaurant/bar-area.png`,
        `${siteConfig.url}/images/restaurant/dining-arches.png`,
      ],
      sameAs: [
        siteConfig.social.instagram,
        siteConfig.social.facebook,
      ],
      potentialAction: {
        "@type": "ReserveAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `tel:${siteConfig.contact.phone.replace(/\s/g, "")}`,
          actionPlatform: [
            "http://schema.org/DesktopWebPlatform",
            "http://schema.org/MobileWebPlatform",
          ],
        },
        result: {
          "@type": "Reservation",
          name: "Réservation de table",
        },
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        reviewCount: "150",
        bestRating: "5",
        worstRating: "1",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteConfig.url}/#website`,
      url: siteConfig.url,
      name: "Epictete Restaurant",
      description: "Site officiel d'Epictete Restaurant - Fine Dining Italien & Méditerranéen à Bouskoura",
      publisher: {
        "@id": `${siteConfig.url}/#restaurant`,
      },
      inLanguage: "fr-MA",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteConfig.url}/menu?search={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: "Epictete Group",
      url: siteConfig.url,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}/logo.png`,
        width: 512,
        height: 512,
      },
      contactPoint: {
        "@type": "ContactPoint",
        telephone: siteConfig.contact.phone,
        contactType: "reservations",
        availableLanguage: ["French", "English", "Arabic"],
      },
      sameAs: [
        siteConfig.social.instagram,
        siteConfig.social.facebook,
      ],
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${siteConfig.url}/#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Accueil",
          item: siteConfig.url,
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${playfair.variable} ${inter.variable} antialiased`}>
        <ThemeProvider defaultTheme="dark" storageKey="epictete-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
