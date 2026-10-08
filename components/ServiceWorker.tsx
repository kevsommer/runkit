"use client";

import { useEffect } from "react";

/** Registers the service worker in production builds. */
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(async () => {
        // Hand the SW the assets this page already loaded so the very first
        // visit is available offline too.
        const reg = await navigator.serviceWorker.ready;
        const urls = performance
          .getEntriesByType("resource")
          .map((e) => e.name)
          .filter((u) => u.startsWith(location.origin) && !u.includes("/api/"));
        reg.active?.postMessage({ type: "CACHE_URLS", urls: [location.href, ...urls] });
      })
      .catch(() => {
        // Offline support is a progressive enhancement.
      });
  }, []);
  return null;
}
