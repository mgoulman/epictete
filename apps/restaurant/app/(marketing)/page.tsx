import {
  HeroSection,
  PhilosophySection,
  GallerySection,
  FeaturedDishesSection,
  TestimonialsSection,
  LocationSection,
  CTASection,
} from "@/components/sections";
import { PWARedirectToLogin } from "@/components/pwa-redirect";

export default function HomePage() {
  return (
    <>
      <PWARedirectToLogin />
      <HeroSection />
      <PhilosophySection />
      <GallerySection />
      <FeaturedDishesSection />
      <TestimonialsSection />
      <LocationSection />
      <CTASection />
    </>
  );
}
