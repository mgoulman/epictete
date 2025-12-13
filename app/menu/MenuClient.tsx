"use client";

import { useEffect, useRef, useState } from "react";

type MenuClientProps = {
  pdfHref: string;
};

function LoadingOverlay({
  state,
  downloadHref,
}: {
  state: "loading" | "error";
  downloadHref: string;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center text-white">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      {state === "error" && (
        <div className="pointer-events-auto flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-medium text-white/90">
            Unable to load the embedded menu.
          </p>
          <a
            className="rounded-full border border-white/40 px-5 py-2 text-sm font-semibold text-white hover:border-white"
            href={downloadHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download menu PDF
          </a>
        </div>
      )}
    </div>
  );
}

export function MenuClient({ pdfHref }: MenuClientProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const pagesRef = useRef<HTMLDivElement>(null);
  const workerSrcRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = pagesRef.current;
    if (!container) {
      return;
    }

    const loadPdf = async () => {
      container.replaceChildren();
      setIsLoaded(false);
      setHasError(false);

      try {
        const [{ getDocument, GlobalWorkerOptions }, workerModule] =
          await Promise.all([
            import("pdfjs-dist"),
            import("pdfjs-dist/build/pdf.worker.min.js?url"),
          ]);

        if (!workerSrcRef.current) {
          workerSrcRef.current = (workerModule as { default: string }).default;
        }

        if (workerSrcRef.current && GlobalWorkerOptions.workerSrc !== workerSrcRef.current) {
          GlobalWorkerOptions.workerSrc = workerSrcRef.current;
        }

        const pdf = await getDocument(pdfHref).promise;
        const pixelRatio = window.devicePixelRatio || 1;
        const baseScale = window.innerWidth < 768 ? 0.9 : 1.15;

        for (
          let pageNumber = 1;
          pageNumber <= pdf.numPages && !cancelled;
          pageNumber++
        ) {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({
            scale: baseScale * pixelRatio,
          });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${viewport.width / pixelRatio}px`;
          canvas.style.height = `${viewport.height / pixelRatio}px`;
          canvas.className =
            "mx-auto max-w-full rounded-lg bg-white shadow-2xl";

          if (context) {
            await page.render({
              canvasContext: context,
              viewport,
              canvas,
            }).promise;
          }

          if (!cancelled) {
            container.appendChild(canvas);
          }
        }

        if (!cancelled) {
          setIsLoaded(true);
        }
      } catch (error) {
        console.error("Failed to render PDF", error);
        if (!cancelled) {
          setHasError(true);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [pdfHref]);

  return (
    <main className="flex h-screen flex-col bg-black text-white">
      <header className="flex flex-col gap-1 border-b border-white/10 bg-black/80 px-6 py-4 text-center text-sm uppercase tracking-[0.2em] text-white/70">
        <span>Epictete Restaurant</span>
        <span className="text-xs normal-case tracking-normal text-white/60">
          Menu Viewer
        </span>
      </header>
      <section className="flex flex-1 flex-col">
        <div className="relative min-h-0 flex-1">
          {!isLoaded && (
            <LoadingOverlay
              state={hasError ? "error" : "loading"}
              downloadHref={pdfHref}
            />
          )}
          <div
            ref={pagesRef}
            className="flex h-full flex-1 flex-col gap-6 overflow-y-auto bg-stone-950/70 px-3 py-6 md:px-8"
          />
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
