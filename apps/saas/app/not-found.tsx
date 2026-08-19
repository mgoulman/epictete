import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-[var(--color-background)]">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius)] bg-[var(--color-secondary)] text-[var(--color-muted-foreground)]">
        <Compass className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-[var(--color-foreground)]">Page introuvable</h1>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Cette page n’existe pas ou a été déplacée.</p>
      <Link href="/" className="mt-5 text-sm font-medium text-[var(--color-accent)] hover:underline">
        Retour à l’accueil
      </Link>
    </div>
  );
}
