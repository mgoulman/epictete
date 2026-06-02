"use client";

import { useEffect } from "react";

// Redirect to /login when the home page is opened from an installed PWA.
// Browser visits remain on the landing page. This handles existing installs
// whose cached manifest still has start_url set to "/".
export function PWARedirectToLogin() {
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      window.location.replace("/login");
    }
  }, []);
  return null;
}
