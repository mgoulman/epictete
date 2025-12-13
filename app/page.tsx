export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-950 px-6 py-16 text-stone-100">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border border-stone-800 bg-stone-900 text-3xl font-semibold tracking-wide text-amber-200">
          ER
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-stone-500">
            Epictete Restaurant
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Website coming soon
          </h1>
        </div>
        <p className="max-w-md text-balance text-base text-stone-400">
          We&apos;re preparing a refreshed online experience with reservations,
          events, and chef updates. In the meantime, use{" "}
          <span className="font-semibold text-amber-200">
            menu.epictetelerestaurant.ma
          </span>{" "}
          to view the live menu.
        </p>
        <div className="text-sm text-stone-500">
          Questions?{" "}
          <a
            className="text-amber-300 underline decoration-dotted hover:text-amber-200"
            href="mailto:contact@epictetelerestaurant.ma"
          >
            contact@epictetelerestaurant.ma
          </a>
        </div>
      </div>
    </main>
  );
}
