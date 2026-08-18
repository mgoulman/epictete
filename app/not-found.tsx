import Link from 'next/link';

export const metadata = { title: 'Page introuvable' };

// Root 404. Rendered inside the root layout (dark theme).
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0c0c0d] px-6 text-center text-[#e7e7e5]">
      <div className="max-w-md">
        <p className="text-6xl font-bold tracking-tight text-[#606338]">404</p>
        <h1 className="mt-4 text-xl font-semibold">Page introuvable</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#a1a1a0]">
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg bg-[#606338] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d4f2e]"
          >
            Accueil
          </Link>
          <Link
            href="/admin"
            className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-[#e7e7e5] transition-colors hover:bg-white/5"
          >
            Backoffice
          </Link>
        </div>
      </div>
    </div>
  );
}
