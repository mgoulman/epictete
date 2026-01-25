import Link from "next/link";
import Image from "next/image";
import { Instagram, Facebook, MapPin, Phone, Mail } from "lucide-react";
import { siteConfig } from "@/config/site";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-secondary border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full overflow-hidden bg-[#EDE6D6] flex items-center justify-center shadow-lg">
                <Image
                  src="/logos/logo-icon.png"
                  alt="Epictète"
                  width={44}
                  height={44}
                  className="w-11 h-11 object-cover"
                />
              </div>
              <span className="text-xl font-heading tracking-wide text-foreground">
                {siteConfig.shortName}
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Une philosophie du goût. Découvrez une expérience gastronomique unique
              inspirée de la sagesse stoïcienne.
            </p>
            {/* Social Links */}
            <div className="flex gap-4 pt-2">
              <a
                href={siteConfig.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-primary text-muted-foreground hover:text-accent hover:bg-card transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a
                href={siteConfig.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-primary text-muted-foreground hover:text-accent hover:bg-card transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-4">
              Navigation
            </h3>
            <ul className="space-y-3">
              {siteConfig.navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-accent transition-colors text-sm"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-4">
              Horaires
            </h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <span className="text-foreground">Tous les jours:</span>
                <br />
                {siteConfig.hours.daily}
              </li>
              <li>
                <span className="text-accent">{siteConfig.hours.note}</span>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-4">
              Contact
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-3 text-muted-foreground hover:text-accent transition-colors text-sm"
                >
                  <Phone size={16} />
                  {siteConfig.contact.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="flex items-center gap-3 text-muted-foreground hover:text-accent transition-colors text-sm"
                >
                  <Mail size={16} />
                  {siteConfig.contact.email}
                </a>
              </li>
              <li>
                <div className="flex items-start gap-3 text-muted-foreground text-sm">
                  <MapPin size={16} className="mt-0.5 shrink-0" />
                  {siteConfig.contact.address}
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {currentYear} {siteConfig.name}. Tous droits réservés.
          </p>
          <div className="flex gap-6">
            {siteConfig.footerLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-xs text-muted-foreground hover:text-accent transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
