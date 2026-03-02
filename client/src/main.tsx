import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// QA: prevent stale PWA cache/SW issues on run.app/a.run.app (rollback-safe)
const __isQaHost = /(\.a\.run\.app$|\.run\.app$)/.test(window.location.hostname);
const __isRunApp = /(\.run\.app$|\.a\.run\.app$)/.test(window.location.hostname);

async function unregisterAllSWAndClearCaches() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // no-op: nunca bloquear el render por SW
  }
}

if (__isQaHost) {
  void unregisterAllSWAndClearCaches();
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error('No se encontró <div id="root">');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ("serviceWorker" in navigator) {
  if (__isRunApp) {
    void unregisterAllSWAndClearCaches();
  } else {
    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
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
      } catch {
        // no-op
      }
    });
  }
}
