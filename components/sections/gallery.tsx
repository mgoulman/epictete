"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import Image from "next/image";
import { Section, SectionHeader } from "@/components/layout/section";
import { X } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useSiteContent } from "@/lib/hooks/useSiteContent";

/**
 * Restaurant Gallery Images
 * Color palette extracted from images:
 * - Primary: Deep blacks (#0a0a0a) - shadows, dramatic contrast
 * - Gold/Brass: (#c9a962, #d4af37) - railings, fixtures, accent lighting
 * - Olive Green: (#6b7c4c, #4a5d3a) - velvet seating, cushions, plants
 * - Cream/Warm White: (#f5f0e6, #e8e0d0) - walls, arches, marble
 * - Warm Amber: (#e6b854, #f0c96a) - ambient lighting, globe lights
 * - Blue-Grey Tile: (#5a6b7a) - zellige tiles accent
 */

type ImageKey = "hero" | "bar" | "arches" | "lounge" | "perspective" | "intimate";

interface GalleryImageData {
  id: ImageKey;
  src: string;
  aspectRatio: string;
  featured?: boolean;
}

const galleryImageData: GalleryImageData[] = [
  {
    id: "hero",
    src: "/images/restaurant/main-hall.png",
    aspectRatio: "landscape",
    featured: true,
  },
  {
    id: "bar",
    src: "/images/restaurant/bar-area.png",
    aspectRatio: "landscape",
    featured: true,
  },
  {
    id: "arches",
    src: "/images/restaurant/dining-arches.png",
    aspectRatio: "square",
  },
  {
    id: "lounge",
    src: "/images/restaurant/lounge-greenery.png",
    aspectRatio: "square",
  },
  {
    id: "perspective",
    src: "/images/restaurant/arches-perspective.png",
    aspectRatio: "square",
  },
  {
    id: "intimate",
    src: "/images/restaurant/intimate-table.png",
    aspectRatio: "square",
  },
];

interface ResolvedImage extends GalleryImageData {
  alt: string;
  title: string;
  description: string;
}

function GalleryImage({
  image,
  index,
  isInView,
  onImageClick
}: {
  image: ResolvedImage;
  index: number;
  isInView: boolean;
  onImageClick: (image: ResolvedImage) => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.08 }}
      className={`
        relative overflow-hidden rounded-2xl cursor-pointer group
        ${image.featured ? "sm:col-span-2 lg:col-span-2 lg:row-span-2" : ""}
        ${image.aspectRatio === "landscape" ? "aspect-16/10" : "aspect-square"}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onImageClick(image)}
    >
      {/* Image container - scale on hover (desktop only via CSS) */}
      <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-105">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          className={`
            object-cover transition-opacity duration-500
            ${isLoaded ? "opacity-100" : "opacity-0"}
          `}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onLoad={() => setIsLoaded(true)}
          loading={image.featured ? undefined : "lazy"}
          priority={image.featured}
        />
      </div>

      {/* Loading skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-card animate-pulse" />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-t from-primary/90 via-primary/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

      {/* Content overlay - always visible on mobile, hover on desktop */}
      <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-end">
        <h3 className="text-foreground font-heading text-xl md:text-2xl font-semibold transition-transform duration-300 group-hover:-translate-y-2">
          {image.title}
        </h3>

        <p className="text-muted-foreground text-sm mt-2 line-clamp-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
          {image.description}
        </p>
      </div>
    </motion.div>
  );
}

function Lightbox({
  image,
  onClose,
  brandName,
}: {
  image: ResolvedImage | null;
  onClose: () => void;
  brandName: string;
}) {
  if (!image) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary/98 sm:bg-primary/95 sm:backdrop-blur-md p-4 md:p-8"
      onClick={onClose}
    >
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="absolute top-6 right-6 p-3 rounded-full bg-card/50 hover:bg-card text-foreground hover:text-accent transition-colors z-10"
        onClick={onClose}
      >
        <X size={24} />
      </motion.button>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative max-w-6xl w-full aspect-16/10 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: "0 0 60px rgba(201, 169, 98, 0.2)",
        }}
      >
        <Image
          src={image.src}
          alt={image.alt}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />

        {/* Info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 bg-linear-to-t from-primary/90 to-transparent">
          <p className="text-accent text-xs sm:text-sm font-medium uppercase tracking-[0.2em] mb-2">
            {brandName}
          </p>
          <h3 className="text-foreground font-heading text-xl sm:text-2xl md:text-3xl font-semibold">
            {image.title}
          </h3>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg mt-2 max-w-2xl">
            {image.description}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function GallerySection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [selectedImage, setSelectedImage] = useState<ResolvedImage | null>(null);
  const { t } = useTranslation();
  const { getSectionText } = useSiteContent();
  const s = (key: string, fallback: string) => getSectionText('gallery', key, fallback);

  const galleryImages: ResolvedImage[] = galleryImageData.map((img) => ({
    ...img,
    alt: t.gallery.images[img.id].alt,
    title: t.gallery.images[img.id].title,
    description: t.gallery.images[img.id].description,
  }));

  return (
    <>
      <Section id="gallery" className="bg-secondary overflow-hidden">
        <SectionHeader
          eyebrow={s('eyebrow', t.gallery.eyebrow)}
          title={s('title', t.gallery.title)}
          description={s('description', t.gallery.description)}
        />

        <div
          ref={ref}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6"
        >
          {galleryImages.map((image, index) => (
            <GalleryImage
              key={image.id}
              image={image}
              index={index}
              isInView={isInView}
              onImageClick={setSelectedImage}
            />
          ))}
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />
      </Section>

      {/* Lightbox */}
      {selectedImage && (
        <Lightbox image={selectedImage} onClose={() => setSelectedImage(null)} brandName={t.common.brandName} />
      )}
    </>
  );
}
