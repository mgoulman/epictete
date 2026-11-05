import { ReactNode } from "react";
import Image from "next/image";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = "", hover = true }: CardProps) {
  return (
    <div
      className={`
        bg-card rounded-[var(--radius)] border border-border overflow-hidden shadow-[var(--shadow-xs)]
        ${hover ? "transition-all duration-200 hover:border-accent/40 hover:shadow-[var(--shadow-md)]" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface CardImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: "square" | "video" | "wide";
}

const aspectRatios = {
  square: "aspect-square",
  video: "aspect-video",
  wide: "aspect-[4/3]",
};

export function CardImage({
  src,
  alt,
  className = "",
  aspectRatio = "wide",
}: CardImageProps) {
  return (
    <div className={`relative overflow-hidden ${aspectRatios[aspectRatio]}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className={`object-cover transition-transform duration-500 group-hover:scale-105 ${className}`}
      />
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className = "" }: CardTitleProps) {
  return (
    <h3 className={`text-lg font-semibold text-foreground ${className}`}>
      {children}
    </h3>
  );
}

interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function CardDescription({ children, className = "" }: CardDescriptionProps) {
  return (
    <p className={`mt-2 text-muted-foreground text-sm leading-relaxed ${className}`}>
      {children}
    </p>
  );
}
