"use client";

// Client-side TMDB hooks. When the proxy reports no API key, we let the
// caller fall back to the existing local Drizzle-seeded content.
import { useQuery } from "@tanstack/react-query";

export interface TmdbItem {
  id: string;
  tmdbId: number;
  type: "movie" | "series";
  title: string;
  description: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  thumbnailUrl: string | null;
  rating: number | null;
  year: string;
  durationMin: number | null;
  seasons: number | null;
  genres: string[];
}

interface TmdbStatus {
  configured: boolean;
  mode: "v3-key" | "v4-token" | "unconfigured";
}

async function jsonOrFallback<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { credentials: "include" });
  if (res.status === 503) return null; // not configured
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return (await res.json()) as T;
}

export function useTmdbStatus() {
  return useQuery<TmdbStatus>({
    queryKey: ["/api/tmdb/status"],
    queryFn: async () => {
      const res = await fetch("/api/tmdb/status", { credentials: "include" });
      if (!res.ok) return { configured: false, mode: "unconfigured" };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTmdbTrending(window: "day" | "week" = "week", kind: "all" | "tv" = "all") {
  return useQuery<TmdbItem[] | null>({
    queryKey: [`/api/tmdb/trending?window=${window}&kind=${kind}`],
    queryFn: () =>
      jsonOrFallback<TmdbItem[]>(`/api/tmdb/trending?window=${window}&kind=${kind}`),
    staleTime: 30 * 60 * 1000,
  });
}

export function useTmdbPopular(kind: "movie" | "tv" = "movie") {
  return useQuery<TmdbItem[] | null>({
    queryKey: [`/api/tmdb/popular?kind=${kind}`],
    queryFn: () => jsonOrFallback<TmdbItem[]>(`/api/tmdb/popular?kind=${kind}`),
    staleTime: 30 * 60 * 1000,
  });
}

export function useTmdbTopRated(kind: "movie" | "tv" = "movie") {
  return useQuery<TmdbItem[] | null>({
    queryKey: [`/api/tmdb/top-rated?kind=${kind}`],
    queryFn: () => jsonOrFallback<TmdbItem[]>(`/api/tmdb/top-rated?kind=${kind}`),
    staleTime: 30 * 60 * 1000,
  });
}

export function useTmdbDiscover(opts: {
  kind?: "movie" | "tv";
  genre?: string;
  sort?: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (opts.kind) params.set("kind", opts.kind);
  if (opts.genre) params.set("genre", opts.genre);
  if (opts.sort) params.set("sort", opts.sort);
  if (opts.page) params.set("page", String(opts.page));
  const qs = params.toString();
  return useQuery<TmdbItem[] | null>({
    queryKey: [`/api/tmdb/discover?${qs}`],
    queryFn: () => jsonOrFallback<TmdbItem[]>(`/api/tmdb/discover?${qs}`),
    staleTime: 30 * 60 * 1000,
  });
}
