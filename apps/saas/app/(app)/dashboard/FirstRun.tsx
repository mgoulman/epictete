import Link from "next/link";
import { Store, UserPlus, Wallet, ArrowRight, Check } from "lucide-react";

export interface OnboardingSteps {
  profile: boolean;
  team: boolean;
  caisse: boolean;
}

const STEPS = [
  { key: "profile" as const, icon: Store, title: "Complétez le profil du restaurant", body: "Nom, ville, devise et informations légales (ICE / RC).", href: "/reglages/restaurant", cta: "Compléter" },
  { key: "team" as const, icon: UserPlus, title: "Ajoutez votre équipe", body: "Invitez un manager ou un caissier à vous rejoindre.", href: "/reglages/utilisateurs", cta: "Ajouter" },
  { key: "caisse" as const, icon: Wallet, title: "Enregistrez votre première Feuille de Caisse", body: "Le geste quotidien qui garde le contrôle de votre argent.", href: "/caisse", cta: "Commencer", goal: true },
];

export function FirstRun({ steps }: { steps: OnboardingSteps }) {
  const doneCount = STEPS.filter((s) => steps[s.key]).length;
  const currentKey = STEPS.find((s) => !steps[s.key])?.key;
  const pct = Math.round((doneCount / STEPS.length) * 100);

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
            Bienvenue 👋 Configurons votre espace
          </h2>
          <span className="text-sm font-medium text-[var(--color-muted-foreground)] whitespace-nowrap">
            {doneCount} sur {STEPS.length}
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          L’objectif : enregistrer votre première feuille de caisse.
        </p>
        <div className="mt-3 h-1.5 rounded-full bg-[var(--color-secondary)] overflow-hidden">
          <div className="h-full rounded-full bg-[var(--color-accent)] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ol className="divide-y divide-[var(--color-border)]">
        {STEPS.map((s, i) => {
          const done = steps[s.key];
          const current = s.key === currentKey;
          const Icon = done ? Check : s.icon;
          return (
            <li key={s.key} className={"flex items-center gap-4 px-6 py-4 " + (current ? "bg-[var(--color-accent)]/[0.04]" : "")}>
              <span
                className={
                  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius)] " +
                  (done
                    ? "bg-[var(--color-positive-bg)] text-[var(--color-positive)]"
                    : current
                      ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                      : "bg-[var(--color-secondary)] text-[var(--color-muted-foreground)]")
                }
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">Étape {i + 1}</span>
                  {s.goal && !done && (
                    <span className="text-[10px] font-semibold rounded px-1.5 py-0.5 bg-[var(--color-accent)]/12 text-[var(--color-accent)]">OBJECTIF</span>
                  )}
                </div>
                <div className={"font-medium " + (done ? "text-[var(--color-muted-foreground)] line-through" : "text-[var(--color-foreground)]")}>
                  {s.title}
                </div>
                {!done && <div className="text-sm text-[var(--color-muted-foreground)]">{s.body}</div>}
              </div>
              <Link
                href={s.href}
                className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent)] hover:underline shrink-0"
              >
                {done ? "Modifier" : s.cta} {!done && <ArrowRight className="h-4 w-4" />}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
