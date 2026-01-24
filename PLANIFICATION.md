# Epictete Restaurant - Implementation Plan

## 1. Project Phases Overview

| Phase | Focus | Duration | Priority |
|-------|-------|----------|----------|
| Phase 1 | Foundation & Setup | Day 1 | Critical |
| Phase 2 | Core Components | Day 1-2 | Critical |
| Phase 3 | Home Page | Day 2-3 | Critical |
| Phase 4 | Secondary Pages | Day 3-4 | High |
| Phase 5 | Polish & Optimization | Day 4-5 | High |
| Phase 6 | QA & Deployment | Day 5 | Critical |

---

## 2. Phase 1: Foundation & Setup

### 2.1 Project Restructuring

**Tasks:**
- [ ] Create folder structure (`/components`, `/lib`, `/config`)
- [ ] Set up component directories (`/ui`, `/layout`, `/sections`)
- [ ] Create utility functions (`lib/utils.ts`)
- [ ] Create site configuration (`config/site.ts`)

**Folder Structure to Create:**
```
/components
  /ui
  /layout
  /sections
/lib
/config
/public/images
```

### 2.2 Dependencies Installation

**Commands:**
```bash
npm install lucide-react framer-motion
```

### 2.3 Design System Setup

**Update globals.css with:**
- CSS custom properties for colors
- Typography variables
- Animation utilities
- Base styles

**Font Configuration:**
- Add Playfair Display (headings)
- Add Inter (body)
- Configure in layout.tsx

### 2.4 Configuration Files

**config/site.ts:**
```typescript
export const siteConfig = {
  name: "Epictete Restaurant",
  description: "Fine dining experience...",
  url: "https://epictetelerestaurant.ma",
  // ... navigation, contact info, etc.
};
```

### 2.5 Tailwind CSS 4 Component Patterns

For conditional classes, use variant objects (no external utilities needed):

```tsx
// Button with variants using native approach
function Button({ variant, size, children }) {
  const variants = {
    primary: "bg-accent text-primary hover:bg-accent-hover",
    secondary: "bg-secondary text-foreground hover:bg-border",
    outline: "border border-border bg-transparent hover:bg-secondary",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };
  return (
    <button className={`font-medium rounded-lg ${variants[variant]} ${sizes[size]}`}>
      {children}
    </button>
  );
}
```

### 2.6 Deliverables

- [ ] Folder structure created
- [ ] Dependencies installed
- [ ] globals.css updated with @theme
- [ ] Fonts configured
- [ ] Site config ready

---

## 3. Phase 2: Core Components

### 3.1 Layout Components

| Component | File | Status |
|-----------|------|--------|
| Header | `/components/layout/header.tsx` | Pending |
| MobileNav | `/components/layout/mobile-nav.tsx` | Pending |
| Footer | `/components/layout/footer.tsx` | Pending |
| Section | `/components/layout/section.tsx` | Pending |
| Container | `/components/layout/container.tsx` | Pending |

**Header Requirements:**
- Logo (left)
- Navigation links (center/right)
- CTA button (right)
- Mobile hamburger trigger
- Sticky on scroll with backdrop blur
- Smooth scroll to sections

**Footer Requirements:**
- Logo + tagline
- Quick navigation links
- Contact information
- Social media icons
- Copyright notice

### 3.2 UI Components

| Component | File | Variants |
|-----------|------|----------|
| Button | `/components/ui/button.tsx` | primary, secondary, outline, ghost |
| Card | `/components/ui/card.tsx` | default, featured |
| Badge | `/components/ui/badge.tsx` | default, accent |
| Input | `/components/ui/input.tsx` | text, email, textarea |
| Divider | `/components/ui/divider.tsx` | horizontal, decorative |

**Button Implementation:**
```typescript
// Variants: primary, secondary, outline, ghost
// Sizes: sm, md, lg
// States: default, hover, active, disabled
```

### 3.3 Marketing Layout

**Create `/app/(marketing)/layout.tsx`:**
- Wraps all marketing pages
- Includes Header and Footer
- Smooth scroll behavior

### 3.4 Deliverables

- [ ] Header component with mobile nav
- [ ] Footer component
- [ ] Section/Container components
- [ ] Button component with variants
- [ ] Card component
- [ ] Marketing layout wrapper

---

## 4. Phase 3: Home Page

### 4.1 Section Components

| Section | Priority | Complexity |
|---------|----------|------------|
| Hero | Critical | Medium |
| Philosophy | High | Low |
| Featured Dishes | High | Medium |
| Experience/Gallery | Medium | Medium |
| Testimonials | Medium | Medium |
| Location | High | Low |
| CTA | High | Low |

### 4.2 Hero Section

**File:** `/components/sections/hero.tsx`

**Features:**
- Full viewport height (100vh)
- Background image with overlay gradient
- Animated headline and tagline
- Primary CTA button
- Scroll down indicator
- Optional parallax effect

**Content:**
```
Headline: "Une philosophie du goût"
Tagline: "Découvrez une expérience gastronomique unique..."
CTA: "Réserver une table"
```

### 4.3 Philosophy Section

**File:** `/components/sections/philosophy.tsx`

**Features:**
- Centered text layout
- Elegant typography
- Optional decorative element
- Fade-in animation on scroll

### 4.4 Featured Dishes Section

**File:** `/components/sections/featured-dishes.tsx`

**Features:**
- Grid of 3-4 dish cards
- Image + title + description
- Hover effects
- Link to menu

### 4.5 Experience/Gallery Section

**File:** `/components/sections/gallery.tsx`

**Features:**
- Photo grid (masonry or uniform)
- Lightbox on click (optional Phase 2)
- Smooth reveal animations

### 4.6 Testimonials Section

**File:** `/components/sections/testimonials.tsx`

**Features:**
- 3-4 testimonial cards
- Star ratings
- Customer name and attribution
- Carousel or static grid

### 4.7 Location Section

**File:** `/components/sections/location.tsx`

**Features:**
- Google Maps embed or static map
- Address display
- Operating hours
- Quick contact info

### 4.8 CTA Section

**File:** `/components/sections/cta.tsx`

**Features:**
- Strong headline
- Compelling description
- Primary button
- Background treatment

### 4.9 Home Page Assembly

**File:** `/app/(marketing)/page.tsx`

**Structure:**
```tsx
<main>
  <HeroSection />
  <PhilosophySection />
  <FeaturedDishesSection />
  <GallerySection />
  <TestimonialsSection />
  <LocationSection />
  <CTASection />
</main>
```

### 4.10 Deliverables

- [ ] Hero section complete
- [ ] Philosophy section complete
- [ ] Featured dishes section complete
- [ ] Gallery section complete
- [ ] Testimonials section complete
- [ ] Location section complete
- [ ] CTA section complete
- [ ] Home page assembled and working

---

## 5. Phase 4: Secondary Pages

### 5.1 About Page

**File:** `/app/(marketing)/about/page.tsx`

**Sections:**
1. Hero with restaurant interior image
2. Our Story (narrative text)
3. Philosophy & Values
4. Chef profile (optional)
5. Final CTA

**Estimated Time:** 2-3 hours

### 5.2 Contact Page

**File:** `/app/(marketing)/contact/page.tsx`

**Sections:**
1. Page header
2. Contact form
3. Direct contact info
4. Full-width map
5. Operating hours

**Contact Form Fields:**
- Name (required)
- Email (required)
- Phone (optional)
- Message (required)

**Form Handling:**
- Client-side validation
- Submit to email service or API route
- Success/error states

**Estimated Time:** 3-4 hours

### 5.3 Menu Page Enhancement

**File:** `/app/menu/page.tsx`

**Enhancements:**
- Integrate with site header
- Add back navigation
- Improve loading states
- Better mobile experience

**Estimated Time:** 1-2 hours

### 5.4 Deliverables

- [ ] About page complete
- [ ] Contact page with working form
- [ ] Menu page enhanced
- [ ] All pages responsive

---

## 6. Phase 5: Polish & Optimization

### 6.1 Animations

**Tasks:**
- [ ] Implement scroll reveal animations
- [ ] Add hover transitions
- [ ] Smooth page transitions
- [ ] Loading states

**Tools:** framer-motion, CSS transitions

### 6.2 Responsive Design

**Test Breakpoints:**
- Mobile: 320px, 375px, 390px, 430px
- Tablet: 768px, 1024px
- Desktop: 1280px, 1440px, 1920px

**Checklist:**
- [ ] Navigation works on all devices
- [ ] Images scale properly
- [ ] Typography readable
- [ ] Touch targets adequate (44x44px)
- [ ] No horizontal scroll

### 6.3 Performance Optimization

**Tasks:**
- [ ] Optimize all images (WebP, proper sizing)
- [ ] Implement lazy loading
- [ ] Verify font loading strategy
- [ ] Check bundle size
- [ ] Test Core Web Vitals

**Target Metrics:**
- LCP < 2.5s
- FID < 100ms
- CLS < 0.1

### 6.4 SEO Implementation

**Tasks:**
- [ ] Page-specific metadata
- [ ] OpenGraph images
- [ ] JSON-LD structured data
- [ ] sitemap.xml
- [ ] robots.txt

**Metadata per Page:**
```typescript
// Home
title: "Epictete Restaurant | Fine Dining à Marrakech"
description: "Découvrez Epictete..."

// About
title: "Notre Histoire | Epictete Restaurant"
description: "L'histoire et la philosophie..."

// Contact
title: "Contact & Réservation | Epictete Restaurant"
description: "Contactez-nous ou réservez..."

// Menu
title: "Notre Carte | Epictete Restaurant"
description: "Découvrez notre menu..."
```

### 6.5 Accessibility Audit

**Checklist:**
- [ ] Semantic HTML structure
- [ ] ARIA labels where needed
- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] Color contrast passes WCAG AA
- [ ] Alt text on images
- [ ] Skip to content link

### 6.6 Deliverables

- [ ] All animations implemented
- [ ] Fully responsive design
- [ ] Performance optimized
- [ ] SEO complete
- [ ] Accessibility compliant

---

## 7. Phase 6: QA & Deployment

### 7.1 Pre-Deployment Checklist

**Code Quality:**
- [ ] No ESLint errors
- [ ] No TypeScript errors
- [ ] No console.log statements
- [ ] Code formatted consistently

**Build Verification:**
- [ ] `npm run build` succeeds
- [ ] No build warnings
- [ ] Bundle size acceptable

**Cross-Browser Testing:**
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] iOS Safari
- [ ] Chrome Android

**Content Review:**
- [ ] All placeholder text identified
- [ ] No broken links
- [ ] Images load correctly
- [ ] Forms work properly

### 7.2 Lighthouse Audit

**Target Scores:**
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 90
- SEO: > 95

### 7.3 Deployment

**Platform:** Vercel (already configured)

**Steps:**
1. Push to main branch
2. Verify automatic deployment
3. Test production URL
4. Configure custom domains (if needed)

### 7.4 Post-Launch

- [ ] Monitor Core Web Vitals
- [ ] Check analytics (if configured)
- [ ] Verify forms working
- [ ] Test on real devices

---

## 8. Task Breakdown by Priority

### Critical Path (Must Complete)

1. Dependencies installation
2. Design system setup
3. Header & Footer components
4. Hero section
5. Home page assembly
6. Basic responsive design
7. Build verification
8. Deployment

### High Priority

1. Button & Card components
2. Philosophy section
3. Featured dishes section
4. Location section
5. CTA section
6. About page
7. Contact page with form
8. SEO metadata

### Medium Priority

1. Gallery section
2. Testimonials section
3. Animations
4. Menu page enhancements
5. Accessibility improvements

### Lower Priority (Phase 2)

1. Online reservations
2. Multi-language support
3. Blog/Events
4. Instagram integration
5. Newsletter signup

---

## 9. File Creation Checklist

### Directories

```
mkdir -p components/ui
mkdir -p components/layout
mkdir -p components/sections
mkdir -p lib
mkdir -p config
mkdir -p public/images
mkdir -p app/\(marketing\)/about
mkdir -p app/\(marketing\)/contact
```

### Files to Create

**Phase 1:**
- [ ] `config/site.ts`

**Phase 2:**
- [ ] `components/layout/header.tsx`
- [ ] `components/layout/mobile-nav.tsx`
- [ ] `components/layout/footer.tsx`
- [ ] `components/layout/section.tsx`
- [ ] `components/layout/container.tsx`
- [ ] `components/ui/button.tsx`
- [ ] `components/ui/card.tsx`
- [ ] `app/(marketing)/layout.tsx`

**Phase 3:**
- [ ] `components/sections/hero.tsx`
- [ ] `components/sections/philosophy.tsx`
- [ ] `components/sections/featured-dishes.tsx`
- [ ] `components/sections/gallery.tsx`
- [ ] `components/sections/testimonials.tsx`
- [ ] `components/sections/location.tsx`
- [ ] `components/sections/cta.tsx`
- [ ] `app/(marketing)/page.tsx`

**Phase 4:**
- [ ] `app/(marketing)/about/page.tsx`
- [ ] `app/(marketing)/contact/page.tsx`
- [ ] `components/sections/contact-form.tsx`

---

## 10. Content Requirements

### Images Needed

| Image | Dimensions | Usage |
|-------|------------|-------|
| Hero background | 1920x1080 | Home hero |
| Dish 1-4 | 800x600 | Featured dishes |
| Gallery 1-6 | 600x400 | Gallery grid |
| Restaurant interior | 1200x800 | About hero |
| Chef portrait | 400x500 | About page |
| Logo | SVG | Header/Footer |
| OG Image | 1200x630 | Social sharing |

### Text Content

| Section | Word Count | Status |
|---------|------------|--------|
| Hero tagline | 20-30 | Placeholder |
| Philosophy | 100-150 | Placeholder |
| About story | 300-400 | Placeholder |
| Testimonials (x3) | 50-75 each | Placeholder |
| Contact info | N/A | Needs real data |
| Operating hours | N/A | Needs real data |

---

## 11. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Missing real content | Use high-quality placeholders |
| Missing images | Use Unsplash food photography |
| Form not working | Client-side validation + mailto fallback |
| Performance issues | Optimize images, lazy load |
| Browser incompatibility | Test early, use fallbacks |

---

## 12. Definition of Done

**Component is "Done" when:**
- Code passes linting
- TypeScript types correct
- Responsive on all breakpoints
- Accessible (keyboard, screen reader)
- Animations smooth
- Code reviewed

**Page is "Done" when:**
- All sections integrated
- SEO metadata added
- Performance acceptable
- Cross-browser tested
- Accessibility checked

**Project is "Done" when:**
- All pages complete
- Lighthouse scores met
- No critical bugs
- Build succeeds
- Deployed to production

---

*Document Version: 1.0*
*Last Updated: January 2026*
*Companion to: CONCEPTION.md*
