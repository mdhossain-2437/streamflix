import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// In static/demo deployments (no Express backend), install an in-browser API
// mock so the entire app works standalone. Loaded as a dynamic import so the
// 600+ line mock catalog stays out of the main bundle on real builds — and
// the mock pre-seeds the auth user so the app skips the Landing page flicker
// (which would otherwise force-load the heavy WebGL hero on Home).
async function bootstrap() {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const { installDemoMock, primeDemoQueryCache } = await import(
      "./lib/demoMock"
    );
    installDemoMock();
    // Prime the React Query cache before App renders so useAuth() returns
    // the mock user on first render — no isLoading flash, no Landing-page
    // mount, no Three.js download for already-authed users.
    primeDemoQueryCache();
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
}

bootstrap();
