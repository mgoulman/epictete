export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="text-xs font-semibold uppercase tracking-widest text-[#606338]">
        Programme pilote
      </span>
      <h1 className="text-3xl font-bold sm:text-4xl">
        Fermez la caisse en 2 minutes.<br />Sachez où va chaque dirham.
      </h1>
      <p className="max-w-md text-sm text-neutral-500">
        Le poste de pilotage de votre restaurant — feuille de caisse, stock,
        fournisseurs et équipe, en un seul endroit. Votre caisse reste, vous
        reprenez le contrôle du back-office.
      </p>
      <p className="mt-6 text-xs text-neutral-400">
        SaaS multi-tenant — squelette (Phase 0). Modules partagés à venir depuis packages/core.
      </p>
    </main>
  );
}
