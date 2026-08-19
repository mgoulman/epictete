"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/observability/report";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { where: "global-error", extra: { digest: error.digest } });
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#fdfcf9", color: "#1a1a18" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600 }}>Une erreur critique est survenue</h2>
            <p style={{ marginTop: 8, color: "#6b6b5f" }}>Rechargez la page. Si le problème persiste, contactez le support.</p>
            <button
              onClick={reset}
              style={{ marginTop: 20, height: 40, padding: "0 16px", borderRadius: 12, background: "#606338", color: "#faf9f5", border: "none", fontWeight: 500, cursor: "pointer" }}
            >
              Réessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
