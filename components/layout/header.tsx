"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Sun, Moon, Globe } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface HeaderProps {
  hideThemeToggle?: boolean;
}

export function Header({ hideThemeToggle = false }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { locale, setLocale, t } = useTranslation();

  const toggleTheme = () => {
    if (theme === "system") {
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    } else {
      setTheme(theme === "dark" ? "light" : "dark");
    }
  };

  const toggleLocale = () => {
    setLocale(locale === "fr" ? "en" : "fr");
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

  const navLabels: Record<string, string> = {
    home: t.nav.home,
    menu: t.nav.menu,
    about: t.nav.about,
    reservation: t.nav.reservation,
    contact: t.nav.contact,
  };

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
            aria-label={t.common.logoAriaLabel}
          >
            <div className="h-11 w-11 rounded-full overflow-hidden bg-[#EDE6D6] flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg">
              <Image
                src="/logos/logo-icon.png"
                alt="Epictète"
                width={44}
                height={44}
                className="w-11 h-11 object-cover"
              />
            </div>
            <span className="hidden xs:block text-base sm:text-lg font-heading tracking-wide text-foreground">
              {siteConfig.shortName}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            {siteConfig.navigation.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group py-2"
              >
                {navLabels[item.key] || item.name}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </div>

          {/* Theme Toggle, Language Toggle & CTA Button */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language Switcher */}
            <button
              onClick={toggleLocale}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label={t.common.switchLang}
            >
              <Globe size={16} />
              <span className="uppercase">{locale === "fr" ? "EN" : "FR"}</span>
            </button>

            {!hideThemeToggle && (
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label={resolvedTheme === "dark" ? t.common.lightMode : t.common.darkMode}
              >
                {resolvedTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            )}
            <Button size="sm" asChild>
              <Link href="/reservation">{t.common.reserve}</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className={`lg:hidden p-2 -mr-2 active:scale-95 transition-all touch-manipulation rounded-full ${
              isScrolled
                ? "text-foreground hover:text-accent"
                : "text-white bg-black/30 hover:bg-black/40"
            }`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? t.common.closeMenu : t.common.openMenu}
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
          lg:hidden fixed top-0 h-full w-full max-w-sm bg-primary border-l border-border z-50
          transition-[right] duration-300 ease-out
          ${isMobileMenuOpen ? "right-0" : "-right-full"}
        `}
      >
        <div className="px-6 py-6 space-y-4">
          {siteConfig.navigation.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="block text-lg font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {navLabels[item.key] || item.name}
            </Link>
          ))}
          <div className="pt-4 flex items-center gap-3">
            {/* Mobile Language Switcher */}
            <button
              onClick={toggleLocale}
              className="flex items-center gap-1.5 px-3 py-3 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label={t.common.switchLang}
            >
              <Globe size={18} />
              <span className="uppercase">{locale === "fr" ? "EN" : "FR"}</span>
            </button>
            {!hideThemeToggle && (
              <button
                onClick={toggleTheme}
                className="p-3 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label={resolvedTheme === "dark" ? t.common.lightMode : t.common.darkMode}
              >
                {resolvedTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            )}
            <Button className="flex-1" asChild>
              <Link href="/reservation" onClick={() => setIsMobileMenuOpen(false)}>{t.common.reserve}</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
