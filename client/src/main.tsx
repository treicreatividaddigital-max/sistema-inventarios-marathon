// QA: prevent stale PWA cache/SW issues on run.app/a.run.app (rollback-safe)
const __isQaHost = /(\.a\.run\.app$|\.run\.app$)/.test(window.location.hostname);

if ("serviceWorker" in navigator && __isQaHost) {
  navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
  if ("caches" in window) {
    // @ts-ignore
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
}

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker
const __isRunApp = /(\.run\.app$|\.a\.run\.app$)/.test(window.location.hostname);

if ("serviceWorker" in navigator) {
  if (__isRunApp) {
    // QA: avoid stale PWA cache/SW issues during fast deploy/rollback cycles
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
    if ("caches" in window) {
      // @ts-ignore
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
    }
  } else {
    // Production (custom domain): enable SW
    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");

        // If there's a waiting SW, activate it
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        registration.addEventListener("updatefound", () => {
          const nw = registration.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              nw.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      } catch (error) {
        console.error("SW registration failed:", error);
      }
    });
  }
}
