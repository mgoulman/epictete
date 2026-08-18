import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

export function ComingSoon({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="flex flex-col items-center justify-center text-center rounded-[var(--radius)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-card)] py-16 px-6">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]">
          <Hammer className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-base font-semibold text-[var(--color-foreground)]">
          Module en cours de construction
        </h2>
        <p className="mt-1 max-w-sm text-sm text-[var(--color-muted-foreground)]">
          Ce module fait partie du programme pilote et arrive prochainement.
        </p>
      </div>
    </>
  );
}
