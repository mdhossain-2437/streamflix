// OMDB enrichment. Cross-references TMDB items against IMDB / Rotten Tomatoes /
// Metascore via the OMDB API. Free tier is 1000 requests/day so we cache for
// 24h. Returns null when OMDB_API_KEY is not configured (graceful degradation).

import type { Express, Request, Response } from "express";

const BASE = "https://www.omdbapi.com";
const CACHE_MS = 24 * 60 * 60 * 1000;

interface OmdbResponse {
  Response: "True" | "False";
  Title?: string;
  Year?: string;
  Rated?: string;
  Released?: string;
  Runtime?: string;
  Genre?: string;
  Director?: string;
  Writer?: string;
  Actors?: string;
  Plot?: string;
  Language?: string;
  Country?: string;
  Awards?: string;
  Poster?: string;
  Ratings?: Array<{ Source: string; Value: string }>;
  Metascore?: string;
  imdbRating?: string;
  imdbVotes?: string;
  imdbID?: string;
  Type?: string;
  totalSeasons?: string;
  BoxOffice?: string;
  Production?: string;
  Website?: string;
  Error?: string;
}

export interface OmdbEnrichment {
  imdbRating: number | null;
  imdbVotes: string | null;
  rottenTomatoes: number | null;
  metascore: number | null;
  awards: string | null;
  boxOffice: string | null;
  rated: string | null;
  released: string | null;
  director: string | null;
  writer: string | null;
  language: string | null;
  country: string | null;
}

const cache = new Map<string, { data: OmdbEnrichment | null; ts: number }>();

function omdbConfigured(): boolean {
  return !!process.env.OMDB_API_KEY;
}

function parsePercent(value: string | undefined): number | null {
  if (!value) return null;
  const m = value.match(/(\d+)%/);
  return m ? Number(m[1]) : null;
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

function normalizeOmdb(raw: OmdbResponse): OmdbEnrichment {
  const ratings = raw.Ratings || [];
  const rt = ratings.find((r) => r.Source === "Rotten Tomatoes")?.Value;
  return {
    imdbRating: parseNumber(raw.imdbRating),
    imdbVotes: raw.imdbVotes && raw.imdbVotes !== "N/A" ? raw.imdbVotes : null,
    rottenTomatoes: parsePercent(rt),
    metascore: parseNumber(raw.Metascore),
    awards: raw.Awards && raw.Awards !== "N/A" ? raw.Awards : null,
    boxOffice: raw.BoxOffice && raw.BoxOffice !== "N/A" ? raw.BoxOffice : null,
    rated: raw.Rated && raw.Rated !== "N/A" ? raw.Rated : null,
    released: raw.Released && raw.Released !== "N/A" ? raw.Released : null,
    director: raw.Director && raw.Director !== "N/A" ? raw.Director : null,
    writer: raw.Writer && raw.Writer !== "N/A" ? raw.Writer : null,
    language: raw.Language && raw.Language !== "N/A" ? raw.Language : null,
    country: raw.Country && raw.Country !== "N/A" ? raw.Country : null,
  };
}

export async function fetchOmdbByImdbId(imdbId: string): Promise<OmdbEnrichment | null> {
  if (!omdbConfigured() || !imdbId) return null;
  const cached = cache.get(imdbId);
  if (cached && Date.now() - cached.ts < CACHE_MS) return cached.data;
  try {
    const url = new URL(BASE);
    url.searchParams.set("apikey", process.env.OMDB_API_KEY!);
    url.searchParams.set("i", imdbId);
    url.searchParams.set("plot", "short");
    url.searchParams.set("tomatoes", "true");
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const raw = (await res.json()) as OmdbResponse;
    if (raw.Response === "False") {
      cache.set(imdbId, { data: null, ts: Date.now() });
      return null;
    }
    const data = normalizeOmdb(raw);
    cache.set(imdbId, { data, ts: Date.now() });
    return data;
  } catch (e) {
    console.error("[omdb] fetch failed:", e);
    return null;
  }
}

export function registerOmdbRoutes(app: Express): void {
  app.get("/api/omdb/status", (_req: Request, res: Response) => {
    res.json({ configured: omdbConfigured() });
  });

  app.get("/api/omdb/by-imdb/:imdbId", async (req: Request, res: Response) => {
    if (!omdbConfigured()) {
      return res.status(503).json({ message: "OMDB_API_KEY not configured" });
    }
    try {
      const data = await fetchOmdbByImdbId(req.params.imdbId);
      if (!data) return res.status(404).json({ message: "Not found in OMDB" });
      res.json(data);
    } catch (e) {
      console.error("[omdb] by-imdb", e);
      res.status(502).json({ message: "OMDB upstream failed" });
    }
  });
}
