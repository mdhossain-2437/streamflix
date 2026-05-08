// Lightweight TMDB proxy. Reads TMDB_API_KEY (v3) or TMDB_READ_TOKEN (v4 bearer).
// Caches in-memory for 30 min so we don't pound TMDB on every page load.

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

export function tmdbConfigured(): boolean {
  return !!(process.env.TMDB_API_KEY || process.env.TMDB_READ_TOKEN);
}

export function tmdbMode(): "v4-token" | "v3-key" | "unconfigured" {
  if (process.env.TMDB_READ_TOKEN) return "v4-token";
  if (process.env.TMDB_API_KEY) return "v3-key";
  return "unconfigured";
}

function buildUrl(path: string, params: Record<string, string | undefined> = {}): string {
  const url = new URL(`${BASE}${path}`);
  if (!process.env.TMDB_READ_TOKEN && process.env.TMDB_API_KEY) {
    url.searchParams.set("api_key", process.env.TMDB_API_KEY);
  }
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, v);
  }
  return url.toString();
}

export async function tmdbFetch<T = unknown>(
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

export interface TmdbMovieRaw {
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

export function normalizeMovie(m: TmdbMovieRaw, kind: "movie" | "series"): TmdbItem {
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

export const TMDB_NOT_CONFIGURED = Response.json(
  { message: "TMDB_API_KEY not configured" },
  { status: 503 },
);
