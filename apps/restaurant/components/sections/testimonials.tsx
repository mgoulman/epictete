"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Star, Quote, Instagram } from "lucide-react";
import { Section, SectionHeader } from "@/components/layout/section";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useSiteContent } from "@/lib/hooks/useSiteContent";

export function TestimonialsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const { t } = useTranslation();
  const { getSectionText, getTestimonials } = useSiteContent();
  const s = (key: string, fallback: string) => getSectionText('testimonials', key, fallback);

  const dbReviews = getTestimonials();

  const testimonials = dbReviews && dbReviews.length > 0
    ? dbReviews.map((review, i) => ({
        id: i + 1,
        name: review.name || `Reviewer ${i + 1}`,
        role: review.role || '',
        content: review.content || '',
        rating: review.rating || 5,
        source: review.source || 'Google',
      }))
    : [
        {
          id: 1,
          name: "Yasmine K.",
          role: t.testimonials.review1Role,
          content: t.testimonials.review1,
          rating: 5,
          source: "Google",
        },
        {
          id: 2,
          name: "Mehdi A.",
          role: t.testimonials.review2Role,
          content: t.testimonials.review2,
          rating: 5,
          source: "Instagram",
        },
        {
          id: 3,
          name: "Sarah L.",
          role: t.testimonials.review3Role,
          content: t.testimonials.review3,
          rating: 5,
          source: "TripAdvisor",
        },
      ];

  return (
    <Section className="bg-secondary">
      <SectionHeader
        eyebrow={s('eyebrow', t.testimonials.eyebrow)}
        title={s('title', t.testimonials.title)}
        description={s('description', t.testimonials.description)}
      />

      <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-8">
        {testimonials.map((testimonial, index) => (
          <motion.div
            key={testimonial.id}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: index * 0.15 }}
            className="relative bg-card border border-border rounded-2xl p-5 sm:p-6 md:p-8 hover:border-accent/50 transition-colors"
          >
            <Quote className="absolute top-4 right-4 sm:top-6 sm:right-6 w-6 h-6 sm:w-8 sm:h-8 text-accent/20" />
            
            <div className="flex items-center gap-1 mb-3 sm:mb-4">
              {Array.from({ length: testimonial.rating }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-accent text-accent" />
              ))}
              <span className="ml-2 text-xs text-muted-foreground">
                {t.testimonials.via} {testimonial.source}
              </span>
            </div>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4 sm:mb-6">
              &ldquo;{testimonial.content}&rdquo;
            </p>

            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <span className="text-accent font-heading font-semibold text-sm sm:text-base">
                  {testimonial.name.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-medium text-foreground text-sm sm:text-base">{testimonial.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{testimonial.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Instagram CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-8 sm:mt-12 text-center"
      >
        <a
          href="https://instagram.com/epictete.restaurant"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors group"
        >
          <Instagram size={18} />
          <span className="text-sm">{s('followInstagram', t.testimonials.followInstagram)}</span>
        </a>
      </motion.div>
    </Section>
  );
}
