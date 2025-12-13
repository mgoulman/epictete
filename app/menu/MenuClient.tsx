"use client";

import { useState } from "react";

type MenuClientProps = {
  pdfHref: string;
};

function LoadingOverlay({
  state,
}: {
  state: "loading" | "error";
}) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center text-white">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      {state === "error" && (
        <div className="flex flex-col gap-1 text-center">
          <p className="text-sm font-medium text-white/90">
            Unable to load the embedded menu.
          </p>
          <p className="text-xs text-white/70">
            Try downloading and opening the PDF directly.
          </p>
        </div>
      )}
    </div>
  );
}

export function MenuClient({ pdfHref }: MenuClientProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const embedUrl = pdfHref.includes("#")
    ? pdfHref
    : `${pdfHref}#zoom=page-fit`;

  return (
    <main className="flex h-screen flex-col bg-black text-white">
      <header className="flex flex-col gap-1 border-b border-white/10 bg-black/80 px-6 py-4 text-center text-sm uppercase tracking-[0.2em] text-white/70">
        <span>Epictete Restaurant</span>
        <span className="text-xs normal-case tracking-normal text-white/60">
          Menu Viewer
        </span>
      </header>
      <section className="flex flex-1 flex-col">
        <div className="relative flex-1 min-h-0">
          {!isLoaded && (
            <LoadingOverlay state={hasError ? "error" : "loading"} />
          )}
          <object
            data={embedUrl}
            type="application/pdf"
            className="h-full w-full"
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
