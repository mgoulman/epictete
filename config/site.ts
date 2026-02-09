export const siteConfig = {
  name: "Epictete Restaurant",
  shortName: "Epictete",
  description:
    "Découvrez Epictete, une expérience gastronomique italienne et méditerranéenne inspirée de la philosophie stoïcienne. Fine dining à Bouskoura, Casablanca.",
  url: "https://epictetelerestaurant.ma",
  ogImage: "/og-image.jpg",
  
  contact: {
    email: "contact@epictetelerestaurant.ma",
    phone: "06 70 69 93 93",
    phoneSecondary: "05 22 06 63 54",
    whatsapp: "+212670699393", // For reservations
    address: "COMMUNE OULED SALEH, lot 62E3, Lotissement AL KHAIR, Bouskoura 27184, Casablanca",
    addressShort: "Bouskoura Sud, Casablanca",
    addressFull: "COMMUNE OULED SALEH, lot 62E3 lotissement AL KHAIR OULED SALEH, casablanca 27184",
  },

  // Verified coordinates from Google Maps (January 2026)
  location: {
    lat: 33.4330849,
    lng: -7.6395038,
    plusCode: "C9M6+65 Bouskoura",
    googleMapsQuery: "Epictete+Restaurant+Bouskoura+Casablanca+Morocco",
    googleMapsUrl: "https://www.google.com/maps/place/Epictete+Restaurant",
    googleMapsDirections: "https://www.google.com/maps/dir//Epictete+Restaurant,+COMMUNE+OULED+SALEH,+lot+62E3+lotissement+AL+KHAIR+OULED+SALEH,+casablanca+27184",
  },

  hours: {
    daily: "10:00 - 22:00",
    weekdays: "10:00 - 22:00",
    weekends: "10:00 - 22:00",
    closed: null, // Open 7 days/week
    note: "Service continu, 7j/7",
  },

  social: {
    instagram: "https://instagram.com/epictete.restaurant",
    facebook: "https://facebook.com/epictete.restaurant",
    tripadvisor: "#",
  },

  navigation: [
    { key: "home", name: "Accueil", href: "/" },
    { key: "menu", name: "Notre Carte", href: "/menu" },
    { key: "about", name: "À Propos", href: "/about" },
    { key: "reservation", name: "Réservation", href: "/reservation" },
    { key: "contact", name: "Contact", href: "/contact" },
  ],

  footerLinks: [
    { key: "legal", name: "Mentions légales", href: "/legal" },
    { key: "privacy", name: "Politique de confidentialité", href: "/privacy" },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
