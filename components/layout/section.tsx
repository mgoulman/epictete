import { ReactNode } from "react";

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
  containerClassName?: string;
  fullWidth?: boolean;
}

export function Section({
  children,
  className = "",
  id,
  containerClassName = "",
  fullWidth = false,
}: SectionProps) {
  return (
    <section
      id={id}
      className={`py-20 md:py-28 lg:py-32 ${className}`}
    >
      {fullWidth ? (
        children
      ) : (
        <div className={`max-w-7xl mx-auto px-6 lg:px-8 ${containerClassName}`}>
          {children}
        </div>
      )}
    </section>
  );
}

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  centered?: boolean;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  centered = true,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`${centered ? "text-center" : ""} mb-12 md:mb-16 ${className}`}>
      {eyebrow && (
        <p className="text-accent text-sm font-medium uppercase tracking-[0.2em] mb-3">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-semibold text-foreground">
        {title}
      </h2>
      {description && (
        <p className={`mt-4 text-muted-foreground text-lg ${centered ? "max-w-2xl mx-auto" : ""}`}>
          {description}
        </p>
      )}
    </div>
  );
}
