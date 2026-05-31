"use client";

import { useState, useEffect } from "react";

export function SplashScreen() {
  const [phase, setPhase] = useState<"visible" | "fading" | "done">("visible");

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const timer = setTimeout(() => {
      setPhase("fading");
    }, 2000);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (phase === "fading") {
      const timer = setTimeout(() => {
        setPhase("done");
        document.body.style.overflow = "";
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F0E7CE",
        opacity: phase === "fading" ? 0 : 1,
        transition: "opacity 0.8s ease-in-out",
        pointerEvents: phase === "fading" ? "none" : "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 2rem",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logos/logo-full.png"
          alt="Epictète Restaurant"
          style={{
            width: "60vw",
            maxWidth: "280px",
            height: "auto",
          }}
        />
        <div
          style={{
            width: "5rem",
            height: "4px",
            background: "rgba(96, 99, 56, 0.2)",
            borderRadius: "9999px",
            overflow: "hidden",
            marginTop: "1.5rem",
          }}
        >
          <div className="splash-loader-bar" />
        </div>
      </div>
    </div>
  );
}
