 "use client";

import type { Metadata } from "next";
import { useState } from "react";

export const metadata: Metadata = {
  title: "Menu | Epictete Restaurant",
  description: "View the latest Epictete restaurant menu.",
};

const DEFAULT_MENU_PDF = "/menu-optimized.pdf";

function LoadingOverlay({
  state,
}: {
  state: "loading" | "error";
}) {
  const isLoading = state === "loading";

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center text-white">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      <p className="text-sm font-medium text-white/90">
        {isLoading
          ? "Loading the menu (150 MB)…"
          : "Unable to load the embedded menu."}
      </p>
      <p className="text-xs text-white/70">
        {isLoading
          ? "Please keep this tab open—large PDFs can take a minute on slower connections."
          : "Try downloading the PDF instead."}
      </p>
    </div>
  );
}

export default function MenuPage() {
  const pdfHref = process.env.NEXT_PUBLIC_MENU_PDF_URL ?? DEFAULT_MENU_PDF;
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <header className="flex flex-col gap-1 border-b border-white/10 bg-black/80 px-6 py-4 text-center text-sm uppercase tracking-[0.2em] text-white/70">
        <span>Epictete Restaurant</span>
        <span className="text-xs normal-case tracking-normal text-white/60">
          Menu Viewer
        </span>
      </header>
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="relative flex-1">
          {!isLoaded && (
            <LoadingOverlay state={hasError ? "error" : "loading"} />
          )}
          <object
            data={`${pdfHref}#zoom=page-fit`}
            type="application/pdf"
            className="h-full w-full flex-1"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
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
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 bg-black/80 px-6 py-4 text-center text-white md:hidden">
          <p className="text-sm font-medium text-white/80">
            PDF too slow? Open it in your device’s PDF app for smoother zoom &
            scrolling.
          </p>
          <a
            className="rounded-full border border-white/30 px-5 py-2 text-sm font-semibold text-white hover:border-white"
            href={pdfHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download menu PDF
          </a>
          <p className="text-xs text-white/60">
            Tip: the file is ~150 MB—connect to Wi‑Fi before downloading to save
            data.
          </p>
        </div>
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
