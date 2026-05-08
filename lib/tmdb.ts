"use client";

// Re-export client-side TMDB hooks from the canonical client lib so legacy
// page imports of `@/lib/tmdb` continue to resolve in the App Router.
export * from "./client/tmdb";
