import Link from "next/link";
import { Store, UserPlus, Wallet, ArrowRight } from "lucide-react";

const STEPS = [
  {
    icon: Store,
    title: "Complétez le profil du restaurant",
    body: "Nom, ville, devise et informations légales (ICE / RC).",
    href: "/reglages/restaurant",
    cta: "Compléter",
  },
  {
    icon: UserPlus,
    title: "Ajoutez votre équipe",
    body: "Invitez un manager ou un caissier à vous rejoindre.",
    href: "/reglages/utilisateurs",
    cta: "Ajouter",
  },
  {
    icon: Wallet,
    title: "Enregistrez votre première Feuille de Caisse",
    body: "Le geste quotidien qui garde le contrôle de votre argent.",
    href: "/caisse",
    cta: "Commencer",
    goal: true,
  },
];

export function FirstRun() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-[var(--color-border)]">
        <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
          Bienvenue 👋 Configurons votre espace
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Trois étapes pour être opérationnel. L’objectif : votre première feuille de caisse.
        </p>
      </div>
      <ol className="divide-y divide-[var(--color-border)]">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.title} className="flex items-center gap-4 px-6 py-4">
              <span
                className={
                  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius)] " +
                  (s.goal
                    ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                    : "bg-[var(--color-secondary)] text-[var(--color-muted-foreground)]")
                }
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">
                    Étape {i + 1}
                  </span>
                  {s.goal && (
                    <span className="text-[10px] font-semibold rounded px-1.5 py-0.5 bg-[var(--color-accent)]/12 text-[var(--color-accent)]">
                      OBJECTIF
                    </span>
                  )}
                </div>
                <div className="font-medium text-[var(--color-foreground)]">{s.title}</div>
                <div className="text-sm text-[var(--color-muted-foreground)]">{s.body}</div>
              </div>
              <Link
                href={s.href}
                className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent)] hover:underline shrink-0"
              >
                {s.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
