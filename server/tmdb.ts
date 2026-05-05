// Lightweight TMDB proxy. Reads TMDB_API_KEY (v3) or TMDB_READ_TOKEN (v4 bearer).
// Caches in-memory for 30 min so we don't pound TMDB on every page load.
// Returns 503 when no key is configured so the client can fall back to local data.

import type { Express, Request, Response } from "express";

const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";
const CACHE_MS = 30 * 60 * 1000;

interface CacheEntry {
  data: unknown;
  ts: number;
}
const cache = new Map<string, CacheEntry>();

function tmdbHeaders(): HeadersInit {
  const v4 = process.env.TMDB_READ_TOKEN;
  if (v4) {
    return {
      Authorization: `Bearer ${v4}`,
      "Content-Type": "application/json",
    };
  }
  return { "Content-Type": "application/json" };
}

function tmdbConfigured(): boolean {
  return !!(process.env.TMDB_API_KEY || process.env.TMDB_READ_TOKEN);
}

function buildUrl(path: string, params: Record<string, string | undefined> = {}): string {
  const url = new URL(`${BASE}${path}`);
  // v3 API key goes on the query string when no v4 token is present
  if (!process.env.TMDB_READ_TOKEN && process.env.TMDB_API_KEY) {
    url.searchParams.set("api_key", process.env.TMDB_API_KEY);
  }
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, v);
  }
  return url.toString();
}

async function tmdbFetch<T = unknown>(
  path: string,
  params: Record<string, string | undefined> = {},
): Promise<T> {
  const url = buildUrl(path, params);
  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    return cached.data as T;
  }
  const res = await fetch(url, { headers: tmdbHeaders() });
  if (!res.ok) {
    throw new Error(`TMDB ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as T;
  cache.set(url, { data, ts: Date.now() });
  return data;
}

interface TmdbMovie {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  runtime?: number;
  number_of_seasons?: number;
}

function normalizeMovie(m: TmdbMovie, kind: "movie" | "series") {
  return {
    id: `tmdb-${kind}-${m.id}`,
    tmdbId: m.id,
    type: kind,
    title: m.title || m.name || "Untitled",
    description: m.overview,
    posterUrl: m.poster_path ? `${IMG}/w500${m.poster_path}` : null,
    backdropUrl: m.backdrop_path ? `${IMG}/original${m.backdrop_path}` : null,
    thumbnailUrl: m.backdrop_path ? `${IMG}/w780${m.backdrop_path}` : null,
    rating: m.vote_average ? Number((m.vote_average / 2).toFixed(1)) : null,
    year: (m.release_date || m.first_air_date || "").slice(0, 4),
    durationMin: m.runtime ?? null,
    seasons: m.number_of_seasons ?? null,
    genres: m.genres?.map((g) => g.name) ?? [],
  };
}

export function registerTmdbRoutes(app: Express): void {
  // Health check — tells the client whether real TMDB data is available.
  app.get("/api/tmdb/status", (_req: Request, res: Response) => {
    res.json({
      configured: tmdbConfigured(),
      mode: process.env.TMDB_READ_TOKEN ? "v4-token" : process.env.TMDB_API_KEY ? "v3-key" : "unconfigured",
    });
  });

  if (!tmdbConfigured()) {
    // Stubs that tell the client "fall back to local seed data".
    const stub = (_req: Request, res: Response) =>
      res.status(503).json({ message: "TMDB_API_KEY not configured" });
    app.get("/api/tmdb/popular", stub);
    app.get("/api/tmdb/trending", stub);
    app.get("/api/tmdb/top-rated", stub);
    app.get("/api/tmdb/search", stub);
    app.get("/api/tmdb/genres", stub);
    app.get("/api/tmdb/discover", stub);
    app.get("/api/tmdb/movie/:id", stub);
    app.get("/api/tmdb/series/:id", stub);
    return;
  }

  app.get("/api/tmdb/popular", async (req, res) => {
    try {
      const kind = (req.query.kind as string) === "tv" ? "tv" : "movie";
      const data = await tmdbFetch<{ results: TmdbMovie[] }>(`/${kind}/popular`, {
        page: (req.query.page as string) || "1",
      });
      res.json(data.results.map((m) => normalizeMovie(m, kind === "tv" ? "series" : "movie")));
    } catch (e) {
      console.error("[tmdb] popular failed:", e);
      res.status(502).json({ message: "TMDB upstream failed" });
    }
  });

  app.get("/api/tmdb/trending", async (req, res) => {
    try {
      const window = (req.query.window as string) === "day" ? "day" : "week";
      const kind = (req.query.kind as string) === "tv" ? "tv" : "all";
      const data = await tmdbFetch<{ results: TmdbMovie[] }>(`/trending/${kind}/${window}`);
      res.json(
        data.results.map((m) =>
          normalizeMovie(m, m.first_air_date ? "series" : "movie"),
        ),
      );
    } catch (e) {
      console.error("[tmdb] trending failed:", e);
      res.status(502).json({ message: "TMDB upstream failed" });
    }
  });

  app.get("/api/tmdb/top-rated", async (req, res) => {
    try {
      const kind = (req.query.kind as string) === "tv" ? "tv" : "movie";
      const data = await tmdbFetch<{ results: TmdbMovie[] }>(`/${kind}/top_rated`);
      res.json(data.results.map((m) => normalizeMovie(m, kind === "tv" ? "series" : "movie")));
    } catch (e) {
      console.error("[tmdb] top-rated failed:", e);
      res.status(502).json({ message: "TMDB upstream failed" });
    }
  });

  app.get("/api/tmdb/discover", async (req, res) => {
    try {
      const kind = (req.query.kind as string) === "tv" ? "tv" : "movie";
      const data = await tmdbFetch<{ results: TmdbMovie[] }>(`/discover/${kind}`, {
        with_genres: req.query.genre as string | undefined,
        sort_by: (req.query.sort as string) || "popularity.desc",
        page: (req.query.page as string) || "1",
      });
      res.json(data.results.map((m) => normalizeMovie(m, kind === "tv" ? "series" : "movie")));
    } catch (e) {
      console.error("[tmdb] discover failed:", e);
      res.status(502).json({ message: "TMDB upstream failed" });
    }
  });

  app.get("/api/tmdb/search", async (req, res) => {
    try {
      const q = (req.query.q as string) || "";
      if (!q) return res.json([]);
      const data = await tmdbFetch<{ results: TmdbMovie[] }>(`/search/multi`, { query: q });
      res.json(
        data.results
          .filter((m) => m.poster_path || m.backdrop_path)
          .map((m) => normalizeMovie(m, m.first_air_date ? "series" : "movie")),
      );
    } catch (e) {
      console.error("[tmdb] search failed:", e);
      res.status(502).json({ message: "TMDB upstream failed" });
    }
  });

  app.get("/api/tmdb/genres", async (req, res) => {
    try {
      const kind = (req.query.kind as string) === "tv" ? "tv" : "movie";
      const data = await tmdbFetch<{ genres: { id: number; name: string }[] }>(
        `/genre/${kind}/list`,
      );
      res.json(data.genres);
    } catch (e) {
      console.error("[tmdb] genres failed:", e);
      res.status(502).json({ message: "TMDB upstream failed" });
    }
  });

  app.get("/api/tmdb/movie/:id", async (req, res) => {
    try {
      const data = await tmdbFetch<TmdbMovie & { credits?: unknown; videos?: unknown }>(
        `/movie/${req.params.id}`,
        { append_to_response: "credits,videos,similar,recommendations" },
      );
      res.json({ ...normalizeMovie(data, "movie"), raw: data });
    } catch (e) {
      console.error("[tmdb] movie failed:", e);
      res.status(502).json({ message: "TMDB upstream failed" });
    }
  });

  app.get("/api/tmdb/series/:id", async (req, res) => {
    try {
      const data = await tmdbFetch<TmdbMovie & { credits?: unknown; videos?: unknown }>(
        `/tv/${req.params.id}`,
        { append_to_response: "credits,videos,similar,recommendations" },
      );
      res.json({ ...normalizeMovie(data, "series"), raw: data });
    } catch (e) {
      console.error("[tmdb] series failed:", e);
      res.status(502).json({ message: "TMDB upstream failed" });
    }
  });
}
