export default function Page() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <a href="/login" className="text-sm font-medium text-[var(--color-accent)] hover:underline">← Retour</a>
        <h1 className="mt-4 text-2xl font-semibold text-[var(--color-foreground)]">Conditions d'utilisation</h1>
        <p className="mt-4 text-sm text-[var(--color-muted-foreground)] leading-relaxed">
          Version pilote — document en cours de finalisation. Les conditions définitives seront
          communiquées avant l’ouverture du service au public. Pour toute question, contactez
          l’équipe Epictète.
        </p>
      </div>
    </div>
  );
}
