# Epictete Restaurant - Website Conception

## 1. Project Overview

### 1.1 Vision
Transform the current "coming soon" placeholder into a production-ready, high-converting restaurant marketing website that embodies the philosophy and elegance of Epictete Restaurant.

### 1.2 Brand Identity

**Restaurant Name:** Epictete (named after Epictetus, the Stoic philosopher)

**Brand Attributes:**
- Intellectual and refined
- Premium positioning
- Timeless elegance over trendy aesthetics
- Philosophy of quality and mindfulness
- Moroccan heritage with international appeal

**Domain:** epictetelerestaurant.ma

---

## 2. Design System

### 2.1 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#0a0a0a` | Deep black - backgrounds |
| `primary-foreground` | `#fafafa` | White - text on dark |
| `secondary` | `#1a1a1a` | Charcoal - cards, sections |
| `accent` | `#c9a962` | Gold - CTAs, highlights |
| `accent-hover` | `#d4af37` | Bright gold - hover states |
| `muted` | `#737373` | Gray - secondary text |
| `muted-foreground` | `#a3a3a3` | Light gray - captions |
| `border` | `#262626` | Subtle borders |
| `card` | `#141414` | Card backgrounds |
| `burgundy` | `#722f37` | Wine accent (optional) |
| `cream` | `#f5f5dc` | Warm backgrounds (light mode) |

### 2.2 Typography

**Font Stack:**
- **Headings:** Playfair Display (serif) - elegance, tradition
- **Body:** Inter (sans-serif) - readability, modern
- **Accent:** Optional script for special elements

**Type Scale:**
```
text-xs:   0.75rem  (12px)
text-sm:   0.875rem (14px)
text-base: 1rem     (16px)
text-lg:   1.125rem (18px)
text-xl:   1.25rem  (20px)
text-2xl:  1.5rem   (24px)
text-3xl:  1.875rem (30px)
text-4xl:  2.25rem  (36px)
text-5xl:  3rem     (48px)
text-6xl:  3.75rem  (60px)
```

### 2.3 Spacing & Layout

**Spacing Scale:** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128 (px)

**Container Max Widths:**
- Content: 1280px
- Text blocks: 768px
- Narrow: 640px

**Section Padding:**
- Desktop: 96px vertical, 64px horizontal
- Tablet: 64px vertical, 32px horizontal
- Mobile: 48px vertical, 24px horizontal

### 2.4 Border Radius

```
radius-sm:   0.25rem (4px)
radius-md:   0.5rem  (8px)
radius-lg:   1rem    (16px)
radius-xl:   1.5rem  (24px)
radius-full: 9999px
```

### 2.5 Shadows (via @theme)

```css
@theme {
  --shadow-glow: 0 0 20px rgb(201 169 98 / 0.3);
}
/* Use Tailwind's built-in shadows: shadow-sm, shadow-md, shadow-lg, shadow-xl */
```

### 2.6 Animation

**Durations:**
- Fast: 150ms
- Normal: 300ms
- Slow: 500ms

**Easing:** `cubic-bezier(0.4, 0, 0.2, 1)`

**Patterns:**
- Fade in on scroll (Intersection Observer)
- Smooth hover transitions
- Subtle parallax on hero
- Staggered list animations

---

## 3. Information Architecture

### 3.1 Sitemap

```
/                    → Home (Landing Page)
├── /menu            → Digital Menu (PDF Viewer)
├── /about           → About & Philosophy
├── /contact         → Contact & Location
└── /reservations    → Reservations (Phase 2)
```

### 3.2 Navigation Structure

**Primary Navigation:**
- Logo (links to home)
- Accueil (Home)
- Notre Carte (Menu)
- À Propos (About)
- Contact
- **CTA Button:** Réserver (Reserve)

**Footer Navigation:**
- Quick Links (same as primary)
- Contact Information
- Social Media Links
- Legal (Mentions légales, Politique de confidentialité)

---

## 4. Page Specifications

### 4.1 Home Page (/)

**Purpose:** Convert visitors into diners through compelling storytelling and clear CTAs.

**Sections:**

1. **Hero Section**
   - Full viewport height
   - Background: High-quality image with dark overlay
   - Content: Headline, tagline, CTA button
   - Scroll indicator arrow

2. **Philosophy Section**
   - Brief restaurant story
   - Connection to Stoic philosophy
   - "The art of mindful dining"

3. **Featured Dishes Section**
   - 3-4 signature dishes
   - Image + name + brief description
   - Link to full menu

4. **Experience Section**
   - Ambiance description
   - Photo gallery grid
   - What makes dining unique

5. **Testimonials Section**
   - 3-4 customer reviews
   - Star ratings
   - Carousel or grid

6. **Location & Hours Section**
   - Embedded map
   - Address
   - Operating hours
   - Quick contact info

7. **CTA Section**
   - Strong closing statement
   - Reservation button
   - Contact alternatives

### 4.2 Menu Page (/menu)

**Current:** PDF viewer (keep and enhance)

**Enhancements:**
- Better header integration
- Download button prominent
- Back to home navigation

### 4.3 About Page (/about)

**Sections:**
1. Hero with restaurant image
2. Our Story
3. Philosophy & Values
4. Chef Profile
5. Team section (optional)
6. Sourcing & Quality

### 4.4 Contact Page (/contact)

**Sections:**
1. Contact form (Name, Email, Phone, Message)
2. Direct contact info (phone, email)
3. Full-width map
4. Operating hours
5. Social media links

---

## 5. Component Architecture

### 5.1 Layout Components

| Component | Description |
|-----------|-------------|
| `Header` | Sticky navigation with blur backdrop |
| `MobileNav` | Slide-out drawer for mobile |
| `Footer` | Site-wide footer |
| `Section` | Consistent section wrapper |
| `Container` | Max-width content container |

### 5.2 UI Components

| Component | Variants |
|-----------|----------|
| `Button` | primary, secondary, outline, ghost |
| `Card` | default, featured, testimonial |
| `Badge` | default, accent |
| `Input` | text, email, textarea |
| `Divider` | horizontal, vertical, decorative |
| `Image` | with overlay, zoom on hover |

### 5.3 Section Components

| Component | Used In |
|-----------|---------|
| `HeroSection` | Home, About |
| `FeaturesSection` | Home |
| `TestimonialsSection` | Home |
| `GallerySection` | Home, About |
| `CTASection` | Home, About |
| `MapSection` | Contact |
| `ContactForm` | Contact |

---

## 6. Technical Architecture

### 6.1 Project Structure

```
/app
  ├── (marketing)/           # Route group
  │   ├── layout.tsx         # Marketing layout
  │   ├── page.tsx           # Home
  │   ├── about/
  │   │   └── page.tsx
  │   └── contact/
  │       └── page.tsx
  ├── menu/
  │   ├── page.tsx
  │   └── MenuClient.tsx
  ├── layout.tsx
  ├── globals.css
  └── favicon.ico

/components
  ├── ui/                    # Atomic components
  ├── layout/                # Layout components
  ├── sections/              # Page sections
  └── icons/                 # Custom icons

/lib
  ├── utils.ts               # Utilities (cn, etc.)
  └── constants.ts           # Constants

/config
  └── site.ts                # Site configuration

/public
  ├── images/
  └── menu-optimized.pdf
```

### 6.2 Dependencies

**Keep:**
- Next.js 16.0.10
- React 19.2.1
- Tailwind CSS 4
- TypeScript 5
- pdfjs-dist

**Add:**
- `lucide-react` - Icons
- `framer-motion` - Animations

**Note:** Tailwind CSS 4 uses native `@theme` directive for design tokens. For conditional classes in components, use simple template literals with variant objects (no external utilities needed).

**Fonts (via next/font/google):**
- Playfair Display
- Inter

### 6.3 Performance Targets

| Metric | Target |
|--------|--------|
| Lighthouse Performance | > 90 |
| Lighthouse Accessibility | > 95 |
| Lighthouse SEO | > 95 |
| LCP | < 2.5s |
| FID | < 100ms |
| CLS | < 0.1 |

---

## 7. SEO Strategy

### 7.1 On-Page SEO

**Homepage:**
```
Title: Epictete Restaurant | Fine Dining à Marrakech
Description: Découvrez Epictete, une expérience gastronomique unique inspirée de la philosophie stoïcienne. Réservez votre table à Marrakech.
```

**Structured Data:** Restaurant schema (JSON-LD)
- @type: Restaurant
- name, address, telephone
- openingHours, priceRange
- servesCuisine, geo

### 7.2 Technical SEO

- Sitemap generation
- robots.txt configuration
- Canonical URLs
- OpenGraph meta tags
- Twitter Card meta tags

---

## 8. Content Strategy

### 8.1 Tone of Voice

- Sophisticated but warm
- Inviting, not pretentious
- Philosophical undertones
- Quality-focused
- French primary, English secondary

### 8.2 Key Messages

1. "Une philosophie du goût" - A philosophy of taste
2. Quality ingredients, mindful preparation
3. Intimate, memorable dining experiences
4. Moroccan heritage meets international cuisine

### 8.3 Placeholder Content

Until real content is provided, use:
- Lorem ipsum for body text
- Placeholder images from Unsplash (food category)
- Sample testimonials
- Generic but realistic operating hours

---

## 9. Accessibility Requirements

- Semantic HTML5 elements
- ARIA labels where needed
- Keyboard navigation support
- Focus indicators visible
- Color contrast WCAG AA compliant
- Alt text for all images
- Skip to content link
- Responsive touch targets (44x44px minimum)

---

## 10. Browser & Device Support

### 10.1 Browsers

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

### 10.2 Devices

- Desktop: 1920px, 1440px, 1280px
- Tablet: 1024px, 768px
- Mobile: 430px, 390px, 375px, 320px

### 10.3 Breakpoints

```
sm:  640px
md:  768px
lg:  1024px
xl:  1280px
2xl: 1536px
```

---

## 11. Future Considerations (Phase 2+)

1. **Online Reservations**
   - OpenTable/TheFork integration
   - Or custom booking system

2. **Multi-language (i18n)**
   - French/English/Arabic
   - next-intl integration

3. **Blog/Events**
   - Chef updates
   - Special events
   - Wine pairings

4. **Instagram Integration**
   - Live feed display
   - Photo gallery

5. **Newsletter**
   - Email collection
   - Brevo/Mailchimp integration

6. **Analytics**
   - Google Analytics 4
   - Conversion tracking

---

*Document Version: 1.0*
*Last Updated: January 2026*
