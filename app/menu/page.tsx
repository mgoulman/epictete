import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Menu | Epictete Restaurant",
  description: "View the latest Epictete restaurant menu.",
};

const DEFAULT_MENU_PDF =
  "https://wkhcoeiuxhftzjcx.public.blob.vercel-storage.com/menu.pdf";

export default function MenuPage() {
  const pdfHref = process.env.NEXT_PUBLIC_MENU_PDF_URL ?? DEFAULT_MENU_PDF;

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <header className="flex flex-col gap-1 border-b border-white/10 bg-black/80 px-6 py-4 text-center text-sm uppercase tracking-[0.2em] text-white/70">
        <span>Epictete Restaurant</span>
        <span className="text-xs normal-case tracking-normal text-white/60">
          Menu Viewer
        </span>
      </header>
      <section className="flex flex-1 flex-col">
        <object
          data={`${pdfHref}#zoom=page-fit`}
          type="application/pdf"
          className="h-full w-full flex-1"
        >
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white/80">
            <p className="text-base font-medium">
              Unable to load the embedded menu.
            </p>
            <a
              className="rounded-full border border-white/40 px-5 py-2 text-sm font-semibold text-white hover:border-white"
              href={pdfHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open / Download menu PDF
            </a>
          </div>
        </object>
      </section>
      <footer className="bg-black/80 px-6 py-4 text-center text-xs text-white/60">
        <a
          href={pdfHref}
          className="underline decoration-dotted underline-offset-4 hover:text-white"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open / Download menu PDF
        </a>
      </footer>
    </main>
  );
}
