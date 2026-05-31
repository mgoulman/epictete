export type SectionName =
  | 'hero'
  | 'philosophy'
  | 'gallery'
  | 'featuredDishes'
  | 'testimonials'
  | 'location'
  | 'cta';

export interface SiteContentRow {
  id: string;
  section: SectionName;
  content: SectionContent;
  updated_at: string;
  updated_by: string | null;
}

// Bilingual content wrapper: { fr: {...}, en: {...} }
export type SectionContent = {
  fr?: Record<string, string>;
  en?: Record<string, string>;
};

// Editable fields per section (all optional — empty = use i18n fallback)
export interface HeroContent {
  welcome?: string;
  tagline?: string;
  taglineAccent?: string;
  description?: string;
}

export interface PhilosophyContent {
  title?: string;
  titleAccent?: string;
  description?: string;
  organic?: string;
  organicDesc?: string;
  woodFired?: string;
  woodFiredDesc?: string;
  homemade?: string;
  homemadeDesc?: string;
  stat1Number?: string;
  stat1Label?: string;
  stat2Number?: string;
  stat2Label?: string;
  stat3Number?: string;
  stat3Label?: string;
}

export interface GalleryContent {
  eyebrow?: string;
  title?: string;
  description?: string;
}

export interface FeaturedDishesContent {
  eyebrow?: string;
  title?: string;
  description?: string;
}

export interface TestimonialItem {
  name?: string;
  role?: string;
  content?: string;
  source?: string;
  rating?: number;
}

export interface TestimonialsContent {
  eyebrow?: string;
  title?: string;
  description?: string;
  followInstagram?: string;
  reviews?: TestimonialItem[];
}

export interface LocationContent {
  eyebrow?: string;
  title?: string;
  description?: string;
}

export interface CTAContent {
  eyebrow?: string;
  title?: string;
  titleAccent?: string;
  description?: string;
}

// Map section name to its content interface
export interface SectionContentMap {
  hero: HeroContent;
  philosophy: PhilosophyContent;
  gallery: GalleryContent;
  featuredDishes: FeaturedDishesContent;
  testimonials: TestimonialsContent;
  location: LocationContent;
  cta: CTAContent;
}

// Fields editable per section (for building editor forms)
export const SECTION_FIELDS: Record<SectionName, string[]> = {
  hero: ['welcome', 'tagline', 'taglineAccent', 'description'],
  philosophy: [
    'title', 'titleAccent', 'description',
    'organic', 'organicDesc', 'woodFired', 'woodFiredDesc', 'homemade', 'homemadeDesc',
    'stat1Number', 'stat1Label', 'stat2Number', 'stat2Label', 'stat3Number', 'stat3Label',
  ],
  gallery: ['eyebrow', 'title', 'description'],
  featuredDishes: ['eyebrow', 'title', 'description'],
  testimonials: ['eyebrow', 'title', 'description', 'followInstagram'],
  location: ['eyebrow', 'title', 'description'],
  cta: ['eyebrow', 'title', 'titleAccent', 'description'],
};
