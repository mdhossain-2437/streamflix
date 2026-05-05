import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Split heavy vendor libs into their own chunks so they cache independently
    // of app code and only load on the routes that need them. Without this,
    // framer-motion + gsap end up duplicated across the Landing/Footer/Home
    // chunks and the hot path bundle balloons past 1MB.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("three") || id.includes("@react-three")) return "vendor-three";
          if (id.includes("hls.js")) return "vendor-hls";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("gsap")) return "vendor-gsap";
          if (id.includes("lenis")) return "vendor-lenis";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("lucide-react") || id.includes("react-icons")) return "vendor-icons";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("react-dom") || id.includes("scheduler") || /[\\/]react[\\/]/.test(id)) {
            return "vendor-react";
          }
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
