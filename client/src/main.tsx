import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installDemoMock } from "./lib/demoMock";

// In static/demo deployments (no Express backend), install an in-browser API
// mock so the entire app works standalone. The mock is tree-shaken in dev
// when a real backend is running — it only activates when the flag is set.
if (import.meta.env.VITE_DEMO_MODE === "true") {
  installDemoMock();
}

createRoot(document.getElementById("root")!).render(<App />);

// Register the offline service worker (production only — Vite HMR conflicts in dev).
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[sw] registration failed", err);
    });
  });
}
