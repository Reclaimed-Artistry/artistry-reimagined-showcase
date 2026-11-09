import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// A deployment can replace hashed lazy-loaded chunks while an open tab or
// installed PWA still has an older app shell. Recover once from Vite's dynamic
// import/preload error by loading the current shell and its matching chunks.
const PRELOAD_RECOVERY_KEY = "selah-preload-recovery-at";
window.addEventListener("vite:preloadError", (event) => {
  const previousAttempt = Number(sessionStorage.getItem(PRELOAD_RECOVERY_KEY) || 0);
  if (Date.now() - previousAttempt < 30_000) return;

  event.preventDefault();
  sessionStorage.setItem(PRELOAD_RECOVERY_KEY, String(Date.now()));
  window.location.reload();
});

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // If a previously installed worker was replaced, reload once so this tab
    // uses the matching, freshly deployed JavaScript bundle.
    if (!hadController || refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<App />);
