"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import Image from "next/image";
import { Section, SectionHeader } from "@/components/layout/section";
import { X } from "lucide-react";

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

const galleryImages = [
  {
    id: "hero",
    src: "/images/restaurant/main-hall.png",
    alt: "Salle principale avec oliviers et éclairage globe",
    title: "La Grande Salle",
    description: "Un espace majestueux où tradition et modernité se rencontrent",
    aspectRatio: "landscape",
    featured: true,
  },
  {
    id: "bar",
    src: "/images/restaurant/bar-area.png",
    alt: "Bar avec finitions dorées et équipe Epictete",
    title: "Le Bar",
    description: "L'art du cocktail dans un cadre Art Déco revisité",
    aspectRatio: "landscape",
    featured: true,
  },
  {
    id: "arches",
    src: "/images/restaurant/dining-arches.png",
    alt: "Tables le long des arches illuminées",
    title: "Les Arches",
    description: "Dîner sous les voûtes lumineuses, une expérience intimiste",
    aspectRatio: "square",
  },
  {
    id: "lounge",
    src: "/images/restaurant/lounge-greenery.png",
    alt: "Banquette olive avec plantes tropicales",
    title: "Le Salon Végétal",
    description: "Nature et confort se mêlent dans cet espace verdoyant",
    aspectRatio: "square",
  },
  {
    id: "perspective",
    src: "/images/restaurant/arches-perspective.png",
    alt: "Perspective des arches avec éclairage indirect",
    title: "Perspective",
    description: "Lignes architecturales épurées et jeux de lumière",
    aspectRatio: "square",
  },
  {
    id: "intimate",
    src: "/images/restaurant/intimate-table.png",
    alt: "Table dressée avec mise au point artistique",
    title: "L'Intimité",
    description: "Chaque table raconte une histoire de convivialité",
    aspectRatio: "square",
  },
];

function GalleryImage({ 
  image, 
  index, 
  isInView,
  onImageClick 
}: { 
  image: typeof galleryImages[0]; 
  index: number;
  isInView: boolean;
  onImageClick: (image: typeof galleryImages[0]) => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`
        relative overflow-hidden rounded-2xl cursor-pointer group
        ${image.featured ? "md:col-span-2 md:row-span-2" : ""}
        ${image.aspectRatio === "landscape" ? "aspect-16/10" : "aspect-square"}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onImageClick(image)}
    >
      {/* Image container with parallax effect */}
      <motion.div
        className="absolute inset-0"
        animate={{ scale: isHovered ? 1.05 : 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <Image
          src={image.src}
          alt={image.alt}
          fill
          className={`
            object-cover transition-all duration-700
            ${isLoaded ? "opacity-100" : "opacity-0"}
          `}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onLoad={() => setIsLoaded(true)}
          priority={image.featured}
        />
      </motion.div>

      {/* Loading skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-card animate-pulse" />
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-linear-to-t from-primary/90 via-primary/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
      
      {/* Gold accent glow on hover */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background: "radial-gradient(ellipse at center, rgba(201, 169, 98, 0.15) 0%, transparent 70%)",
        }}
      />

      {/* Border glow effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          boxShadow: "inset 0 0 0 1px rgba(201, 169, 98, 0.3), 0 0 30px rgba(201, 169, 98, 0.1)",
        }}
      />

      {/* Content overlay */}
      <div className="absolute inset-0 p-6 flex flex-col justify-end">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: isHovered ? 0 : 20, opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <p className="text-accent text-xs font-medium uppercase tracking-[0.2em] mb-2">
            {image.title}
          </p>
        </motion.div>
        
        <motion.h3
          className="text-foreground font-heading text-xl md:text-2xl font-semibold"
          animate={{ y: isHovered ? -8 : 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {image.title}
        </motion.h3>
        
        <motion.p
          className="text-muted-foreground text-sm mt-2 line-clamp-2"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: isHovered ? 0 : 10, opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        >
          {image.description}
        </motion.p>
      </div>

      {/* Corner accent */}
      <motion.div
        className="absolute top-4 right-4 w-8 h-8"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
        transition={{ duration: 0.3 }}
      >
        <div className="w-full h-full border-t-2 border-r-2 border-accent/50 rounded-tr-lg" />
      </motion.div>
    </motion.div>
  );
}

function Lightbox({ 
  image, 
  onClose 
}: { 
  image: typeof galleryImages[0] | null; 
  onClose: () => void;
}) {
  if (!image) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary/95 backdrop-blur-md p-4 md:p-8"
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
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-linear-to-t from-primary/90 to-transparent">
          <p className="text-accent text-sm font-medium uppercase tracking-[0.2em] mb-2">
            Epictete Restaurant
          </p>
          <h3 className="text-foreground font-heading text-3xl font-semibold">
            {image.title}
          </h3>
          <p className="text-muted-foreground text-lg mt-2 max-w-2xl">
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
  const [selectedImage, setSelectedImage] = useState<typeof galleryImages[0] | null>(null);

  return (
    <>
      <Section id="gallery" className="bg-secondary overflow-hidden">
        <SectionHeader
          eyebrow="Notre Espace"
          title="Un Cadre d'Exception"
          description="Découvrez l'atmosphère unique d'Epictete, où chaque détail architectural raconte une histoire d'élégance et de raffinement."
        />

        <div 
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
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
        <Lightbox image={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
    </>
  );
}
