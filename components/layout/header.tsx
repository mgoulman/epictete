"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Menu, X, Sun, Moon, Phone, MapPin, Clock } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === "system") {
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    } else {
      setTheme(theme === "dark" ? "light" : "dark");
    }
  };

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50
        transition-all duration-300
        ${isScrolled
          ? "bg-primary/95 backdrop-blur-md border-b border-border shadow-lg"
          : "bg-transparent"
        }
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-16 sm:h-20" aria-label="Navigation principale">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-3 group z-10"
            aria-label="Epictete Restaurant - Accueil"
          >
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-accent/50 bg-secondary text-accent font-heading text-base sm:text-lg font-semibold group-hover:border-accent group-hover:shadow-glow-sm transition-all duration-300">
              É
            </div>
            <span className="hidden xs:block text-base sm:text-lg font-heading tracking-wide text-foreground">
              {siteConfig.shortName}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            {siteConfig.navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group py-2"
              >
                {item.name}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </div>

          {/* Desktop CTA & Theme Toggle */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
              aria-label={resolvedTheme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
            >
              {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <a
              href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
              className="hidden xl:flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors"
            >
              <Phone size={16} />
              <span>{siteConfig.contact.phone}</span>
            </a>
            <Button size="sm" asChild>
              <a href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}>
                Réserver
              </a>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 -mr-2 text-foreground hover:text-accent active:scale-95 transition-all touch-manipulation"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </nav>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`
          lg:hidden fixed inset-0 bg-primary/60 backdrop-blur-sm z-40
          transition-opacity duration-300
          ${isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      {/* Mobile Menu Panel */}
      <div
        id="mobile-menu"
        className={`
          lg:hidden fixed top-0 right-0 h-full w-full max-w-sm bg-primary border-l border-border z-50
          transform transition-transform duration-300 ease-out
          ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <span className="font-heading text-lg text-foreground">Menu</span>
            <button
              onClick={closeMobileMenu}
              className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
              aria-label="Fermer le menu"
            >
              <X size={24} />
            </button>
          </div>

          {/* Mobile Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-4" aria-label="Menu mobile">
            <div className="space-y-1 px-4">
              {siteConfig.navigation.map((item, index) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 text-lg font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 active:bg-secondary transition-colors py-3.5 px-4 rounded-xl touch-manipulation"
                  onClick={closeMobileMenu}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Quick Info Cards */}
            <div className="mt-6 px-4 space-y-3">
              <div className="bg-secondary/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-accent/10">
                    <Clock size={18} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Horaires</p>
                    <p className="text-sm text-muted-foreground">{siteConfig.hours.daily}</p>
                    <p className="text-xs text-accent mt-0.5">{siteConfig.hours.note}</p>
                  </div>
                </div>
              </div>

              <div className="bg-secondary/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-accent/10">
                    <MapPin size={18} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Adresse</p>
                    <p className="text-sm text-muted-foreground">{siteConfig.contact.addressShort}</p>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* Mobile Menu Footer */}
          <div className="p-4 border-t border-border space-y-3 safe-area-inset-bottom">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-secondary text-foreground hover:bg-border transition-colors touch-manipulation"
                aria-label={resolvedTheme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
              >
                {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                <span className="text-sm">{resolvedTheme === "dark" ? "Mode clair" : "Mode sombre"}</span>
              </button>
            </div>
            <Button className="w-full py-4 text-base" asChild>
              <a href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}>
                <Phone size={18} className="mr-2" />
                Réserver: {siteConfig.contact.phone}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
