// Comprehensive TMDB proxy. Reads TMDB_API_KEY (v3) or TMDB_READ_TOKEN (v4).
// Caches in-memory for 30 min. Returns 503 when no key is configured so the
// client can fall back to local data.
//
// Routes registered under /api/tmdb/*:
//   status, configuration, genres
//   trending, popular, top-rated, now-playing, upcoming, on-the-air, airing-today
//   discover (with full TMDB discover filter surface)
//   movie/:id, series/:id, season/:id/:season, episode/:id/:season/:episode
//   person/:id, search, keyword/:id
//
// Detail endpoints append credits, videos, images, similar, recommendations,
// keywords, external_ids, and watch/providers, then enrich with OMDB ratings
// (when OMDB_API_KEY is set).

import type { Express, Request, Response } from "express";
import { fetchOmdbByImdbId } from "./omdb";

const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";
const CACHE_MS = 30 * 60 * 1000;
const SEARCH_CACHE_MS = 5 * 60 * 1000;

interface CacheEntry {
  data: unknown;
  ts: number;
  ttl: number;
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
  ttl: number = CACHE_MS,
): Promise<T> {
  const url = buildUrl(path, params);
  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < cached.ttl) {
    return cached.data as T;
  }
  const res = await fetch(url, { headers: tmdbHeaders() });
  if (!res.ok) {
    throw new Error(`TMDB ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as T;
  cache.set(url, { data, ts: Date.now(), ttl });
  return data;
}

// Lightweight TMDB shape — fields the UI actually consumes.
interface TmdbBase {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  adult?: boolean;
  original_language?: string;
  media_type?: string;
}

function normalizeMovie(m: TmdbBase, kind: "movie" | "series") {
  const inferredKind: "movie" | "series" =
    m.media_type === "tv" || m.first_air_date || m.number_of_seasons ? "series" : kind;
  return {
    id: `tmdb-${inferredKind}-${m.id}`,
    tmdbId: m.id,
    type: inferredKind,
    title: m.title || m.name || "Untitled",
    description: m.overview || "",
    posterUrl: m.poster_path ? `${IMG}/w500${m.poster_path}` : null,
    backdropUrl: m.backdrop_path ? `${IMG}/original${m.backdrop_path}` : null,
    thumbnailUrl: m.backdrop_path ? `${IMG}/w780${m.backdrop_path}` : null,
    rating: m.vote_average ? Number((m.vote_average / 2).toFixed(1)) : null,
    voteAverage: m.vote_average ?? null,
    voteCount: m.vote_count ?? null,
    popularity: m.popularity ?? null,
    year: (m.release_date || m.first_air_date || "").slice(0, 4),
    durationMin: m.runtime ?? m.episode_run_time?.[0] ?? null,
    seasons: m.number_of_seasons ?? null,
    episodes: m.number_of_episodes ?? null,
    genres: m.genres?.map((g) => g.name) ?? [],
    genreIds: m.genre_ids ?? [],
    originalLanguage: m.original_language ?? null,
    adult: m.adult ?? false,
  };
}

interface TmdbCredits {
  cast?: Array<{
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order?: number;
  }>;
  crew?: Array<{
    id: number;
    name: string;
    job: string;
    department: string;
    profile_path: string | null;
  }>;
}

interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  size?: number;
  published_at?: string;
}

interface TmdbWatchProviders {
  results?: Record<
    string,
    {
      link?: string;
      flatrate?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
      rent?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
      buy?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
    }
  >;
}

interface TmdbExternalIds {
  imdb_id?: string | null;
  facebook_id?: string | null;
  instagram_id?: string | null;
  twitter_id?: string | null;
}

function pickTrailer(videos: TmdbVideo[] | undefined): TmdbVideo | null {
  if (!videos || videos.length === 0) return null;
  const youtube = videos.filter((v) => v.site === "YouTube");
  return (
    youtube.find((v) => v.type === "Trailer" && v.official) ||
    youtube.find((v) => v.type === "Trailer") ||
    youtube.find((v) => v.type === "Teaser") ||
    youtube[0] ||
    null
  );
}

function normalizeCredits(credits: TmdbCredits | undefined) {
  if (!credits) return { cast: [], crew: [], director: null };
  const cast = (credits.cast || []).slice(0, 30).map((c) => ({
    id: c.id,
    name: c.name,
    character: c.character,
    imageUrl: c.profile_path ? `${IMG}/w185${c.profile_path}` : null,
  }));
  const crew = (credits.crew || []).map((c) => ({
    id: c.id,
    name: c.name,
    job: c.job,
    department: c.department,
    imageUrl: c.profile_path ? `${IMG}/w185${c.profile_path}` : null,
  }));
  const director = crew.find((c) => c.job === "Director")?.name || null;
  return { cast, crew, director };
}

function normalizeWatchProviders(p: TmdbWatchProviders | undefined, region = "US") {
  const r = p?.results?.[region];
  if (!r) return null;
  const norm = (
    arr?: Array<{ provider_id: number; provider_name: string; logo_path: string }>,
  ) =>
    (arr || []).map((x) => ({
      id: x.provider_id,
      name: x.provider_name,
      logoUrl: x.logo_path ? `${IMG}/w92${x.logo_path}` : null,
    }));
  return {
    link: r.link || null,
    stream: norm(r.flatrate),
    rent: norm(r.rent),
    buy: norm(r.buy),
  };
}

// ────────────────────────────────────────────────────────────────────────
// Routes
// ────────────────────────────────────────────────────────────────────────
export function registerTmdbRoutes(app: Express): void {
  app.get("/api/tmdb/status", (_req: Request, res: Response) => {
    res.json({
      configured: tmdbConfigured(),
      omdb: !!process.env.OMDB_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      mode: process.env.TMDB_READ_TOKEN
        ? "v4-token"
        : process.env.TMDB_API_KEY
          ? "v3-key"
          : "unconfigured",
    });
  });

  if (!tmdbConfigured()) {
    const stub = (_req: Request, res: Response) =>
      res.status(503).json({ message: "TMDB_API_KEY not configured" });
    [
      "/api/tmdb/configuration",
      "/api/tmdb/genres",
      "/api/tmdb/trending",
      "/api/tmdb/popular",
      "/api/tmdb/top-rated",
      "/api/tmdb/now-playing",
      "/api/tmdb/upcoming",
      "/api/tmdb/on-the-air",
      "/api/tmdb/airing-today",
      "/api/tmdb/discover",
      "/api/tmdb/search",
      "/api/tmdb/movie/:id",
      "/api/tmdb/series/:id",
      "/api/tmdb/season/:id/:season",
      "/api/tmdb/episode/:id/:season/:episode",
      "/api/tmdb/person/:id",
      "/api/tmdb/keyword/:id",
    ].forEach((p) => app.get(p, stub));
    return;
  }

  app.get("/api/tmdb/configuration", async (_req, res) => {
    try {
      const data = await tmdbFetch("/configuration", {}, 24 * 60 * 60 * 1000);
      res.json(data);
    } catch (e) {
      console.error("[tmdb] configuration", e);
      res.status(502).json({ message: "TMDB upstream failed" });
    }
  });

  app.get("/api/tmdb/genres", async (req, res) => {
    try {
      const kind = (req.query.kind as string) === "tv" ? "tv" : "movie";
      const data = await tmdbFetch<{ genres: { id: number; name: string }[] }>(
        `/genre/${kind}/list`,
        {},
        24 * 60 * 60 * 1000,
      );
      res.json(data.genres);
    } catch (e) {
      console.error("[tmdb] genres", e);
      res.status(502).json({ message: "TMDB upstream failed" });
    }
  });

  // Generic helper for the list endpoints below.
  function listEndpoint(
    path: (req: Request) => { url: string; kind: "movie" | "series" | "all" },
  ) {
    return async (req: Request, res: Response) => {
      try {
        const { url, kind } = path(req);
        const data = await tmdbFetch<{ results: TmdbBase[]; total_pages?: number }>(url, {
          page: (req.query.page as string) || "1",
          region: (req.query.region as string) || undefined,
          language: (req.query.language as string) || undefined,
        });
        const fallbackKind: "movie" | "series" = kind === "all" ? "movie" : kind;
        res.json({
          results: (data.results || []).map((m) => normalizeMovie(m, fallbackKind)),
          totalPages: data.total_pages ?? 1,
        });
      } catch (e) {
        console.error("[tmdb] list", e);
        res.status(502).json({ message: "TMDB upstream failed" });
      }
    };
  }

  app.get(
    "/api/tmdb/trending",
    listEndpoint((req) => {
      const window = (req.query.window as string) === "day" ? "day" : "week";
      const kind = ((req.query.kind as string) || "all") as "movie" | "tv" | "all";
      return {
        url: `/trending/${kind === "tv" ? "tv" : kind === "movie" ? "movie" : "all"}/${window}`,
        kind: kind === "tv" ? "series" : kind === "movie" ? "movie" : "all",
      };
    }),
  );

  app.get(
    "/api/tmdb/popular",
    listEndpoint((req) => {
      const kind = (req.query.kind as string) === "tv" ? "tv" : "movie";
      return { url: `/${kind}/popular`, kind: kind === "tv" ? "series" : "movie" };
    }),
  );

  app.get(
    "/api/tmdb/top-rated",
    listEndpoint((req) => {
      const kind = (req.query.kind as string) === "tv" ? "tv" : "movie";
      return { url: `/${kind}/top_rated`, kind: kind === "tv" ? "series" : "movie" };
    }),
  );

  app.get(
    "/api/tmdb/now-playing",
    listEndpoint(() => ({ url: "/movie/now_playing", kind: "movie" })),
  );

  app.get(
    "/api/tmdb/upcoming",
    listEndpoint(() => ({ url: "/movie/upcoming", kind: "movie" })),
  );

  app.get(
    "/api/tmdb/on-the-air",
    listEndpoint(() => ({ url: "/tv/on_the_air", kind: "series" })),
  );

  app.get(
    "/api/tmdb/airing-today",
    listEndpoint(() => ({ url: "/tv/airing_today", kind: "series" })),
  );

  // Discover with full filter surface — genre, year, sort, vote_avg, runtime,
  // language, region, with_keywords, with_people (actor IDs).
  app.get("/api/tmdb/discover", async (req, res) => {
    try {
      const kind = (req.query.kind as string) === "tv" ? "tv" : "movie";
      const params: Record<string, string | undefined> = {
        with_genres: req.query.genre as string | undefined,
        without_genres: req.query.withoutGenres as string | undefined,
        sort_by: (req.query.sort as string) || "popularity.desc",
        page: (req.query.page as string) || "1",
        with_keywords: req.query.keyword as string | undefined,
        with_people: req.query.person as string | undefined,
        with_cast: req.query.cast as string | undefined,
        with_crew: req.query.crew as string | undefined,
        with_companies: req.query.company as string | undefined,
        with_networks: req.query.network as string | undefined,
        with_original_language: req.query.lang as string | undefined,
        region: req.query.region as string | undefined,
        with_origin_country: req.query.country as string | undefined,
        certification_country: (req.query.certCountry as string | undefined) ||
          ((req.query.certification as string | undefined) ? "US" : undefined),
        certification: req.query.certification as string | undefined,
        "vote_average.gte": req.query.minRating as string | undefined,
        "vote_count.gte": req.query.minVotes as string | undefined,
        "with_runtime.gte": req.query.minRuntime as string | undefined,
        "with_runtime.lte": req.query.maxRuntime as string | undefined,
        include_adult: req.query.includeAdult as string | undefined,
      };
      if (kind === "movie") {
        params["primary_release_year"] = req.query.year as string | undefined;
        params["primary_release_date.gte"] = req.query.fromDate as string | undefined;
        params["primary_release_date.lte"] = req.query.toDate as string | undefined;
      } else {
        params["first_air_date_year"] = req.query.year as string | undefined;
        params["first_air_date.gte"] = req.query.fromDate as string | undefined;
        params["first_air_date.lte"] = req.query.toDate as string | undefined;
      }
      const data = await tmdbFetch<{ results: TmdbBase[]; total_pages?: number }>(
        `/discover/${kind}`,
        params,
      );
      res.json({
        results: (data.results || []).map((m) =>
          normalizeMovie(m, kind === "tv" ? "series" : "movie"),
        ),
        totalPages: data.total_pages ?? 1,
      });
    } catch (e) {
      console.error("[tmdb] discover", e);
      res.status(502).json({ message: "TMDB upstream failed" });
    }
  });

  // Multi-search: returns movies + series + people in one query.
  app.get("/api/tmdb/search", async (req, res) => {
    try {
      const q = (req.query.q as string) || "";
      if (!q.trim()) return res.json({ results: [], totalPages: 0 });
      const kind = (req.query.kind as string) || "multi";
      const path =
        kind === "movie" || kind === "tv" || kind === "person"
          ? `/search/${kind}`
          : `/search/multi`;
      const data = await tmdbFetch<{
        results: Array<TmdbBase & { media_type?: string; profile_path?: string | null }>;
        total_pages?: number;
      }>(
        path,
        {
          query: q,
          page: (req.query.page as string) || "1",
          include_adult: (req.query.includeAdult as string) || "false",
          language: (req.query.language as string) || undefined,
        },
        SEARCH_CACHE_MS,
      );

      const results = (data.results || [])
        .filter((m) => m.poster_path || m.backdrop_path || m.profile_path)
        .map((m) => {
          if (m.media_type === "person") {
            return {
              type: "person" as const,
              id: `tmdb-person-${m.id}`,
              tmdbId: m.id,
              name: m.name || "Unknown",
              imageUrl: m.profile_path ? `${IMG}/w185${m.profile_path}` : null,
              popularity: m.popularity ?? null,
            };
          }
          return normalizeMovie(
            m,
            m.media_type === "tv" ? "series" : "movie",
          );
        });

      res.json({ results, totalPages: data.total_pages ?? 1 });
    } catch (e) {
      console.error("[tmdb] search", e);
      res.status(502).json({ message: "TMDB upstream failed" });
    }
  });

  // Detail: movie. Appends credits, videos, similar, recommendations, images,
  // keywords, external_ids, watch/providers + OMDB enrichment via imdb_id.
  app.get("/api/tmdb/movie/:id", async (req, res) => {
    try {
      const data = await tmdbFetch<
        TmdbBase & {
          credits?: TmdbCredits;
          videos?: { results?: TmdbVideo[] };
          similar?: { results?: TmdbBase[] };
          recommendations?: { results?: TmdbBase[] };
          images?: { backdrops?: { file_path: string }[] };
          keywords?: { keywords?: { id: number; name: string }[] };
          external_ids?: TmdbExternalIds;
          "watch/providers"?: TmdbWatchProviders;
          tagline?: string;
          status?: string;
          budget?: number;
          revenue?: number;
          homepage?: string;
          production_companies?: { id: number; name: string; logo_path: string | null }[];
          production_countries?: { iso_3166_1: string; name: string }[];
          spoken_languages?: { iso_639_1: string; english_name: string }[];
        }
      >(`/movie/${req.params.id}`, {
        append_to_response:
          "credits,videos,similar,recommendations,images,keywords,external_ids,watch/providers",
        include_image_language: "en,null",
      });

      const omdb = data.external_ids?.imdb_id
        ? await fetchOmdbByImdbId(data.external_ids.imdb_id)
        : null;

      res.json({
        ...normalizeMovie(data, "movie"),
        tagline: data.tagline ?? null,
        status: data.status ?? null,
        budget: data.budget ?? null,
        revenue: data.revenue ?? null,
        homepage: data.homepage ?? null,
        imdbId: data.external_ids?.imdb_id ?? null,
        production: (data.production_companies || []).map((c) => ({
          id: c.id,
          name: c.name,
          logoUrl: c.logo_path ? `${IMG}/w154${c.logo_path}` : null,
        })),
        countries: data.production_countries || [],
        spokenLanguages: data.spoken_languages || [],
        keywords: data.keywords?.keywords || [],
        backdrops:
          data.images?.backdrops?.slice(0, 12).map((b) => `${IMG}/w1280${b.file_path}`) || [],
        ...normalizeCredits(data.credits),
        trailer: pickTrailer(data.videos?.results),
        videos: (data.videos?.results || []).filter((v) => v.site === "YouTube").slice(0, 8),
        similar: (data.similar?.results || []).map((m) => normalizeMovie(m, "movie")),
        recommendations: (data.recommendations?.results || []).map((m) =>
          normalizeMovie(m, "movie"),
        ),
        watchProviders: normalizeWatchProviders(
          data["watch/providers"],
          (req.query.region as string) || "US",
        ),
        omdb,
      });
    } catch (e) {
      console.error("[tmdb] movie detail", e);
      res.status(502).json({ message: "TMDB upstream failed" });
    }
  });

  app.get("/api/tmdb/series/:id", async (req, res) => {
    try {
      const data = await tmdbFetch<
        TmdbBase & {
          credits?: TmdbCredits;
          videos?: { results?: TmdbVideo[] };
          similar?: { results?: TmdbBase[] };
          recommendations?: { results?: TmdbBase[] };
          images?: { backdrops?: { file_path: string }[] };
          keywords?: { results?: { id: number; name: string }[] };
          external_ids?: TmdbExternalIds;
          "watch/providers"?: TmdbWatchProviders;
          tagline?: string;
          status?: string;
          homepage?: string;
          number_of_seasons?: number;
          number_of_episodes?: number;
          seasons?: Array<{
            id: number;
            season_number: number;
            name: string;
            episode_count: number;
            air_date?: string;
            poster_path: string | null;
            overview: string;
          }>;
          created_by?: Array<{ id: number; name: string; profile_path: string | null }>;
          networks?: Array<{ id: number; name: string; logo_path: string | null }>;
          last_episode_to_air?: { name: string; air_date: string; season_number: number; episode_number: number; overview: string };
          next_episode_to_air?: { name: string; air_date: string; season_number: number; episode_number: number; overview: string };
        }
      >(`/tv/${req.params.id}`, {
        append_to_response:
          "credits,videos,similar,recommendations,images,keywords,external_ids,watch/providers",
        include_image_language: "en,null",
      });

      const omdb = data.external_ids?.imdb_id
        ? await fetchOmdbByImdbId(data.external_ids.imdb_id)
        : null;

      res.json({
        ...normalizeMovie(data, "series"),
        tagline: data.tagline ?? null,
        status: data.status ?? null,
        homepage: data.homepage ?? null,
        imdbId: data.external_ids?.imdb_id ?? null,
        seasonCount: data.number_of_seasons ?? null,
        episodeCount: data.number_of_episodes ?? null,
        seasonsList: (data.seasons || []).map((s) => ({
          id: s.id,
          number: s.season_number,
          name: s.name,
          episodeCount: s.episode_count,
          airDate: s.air_date || null,
          posterUrl: s.poster_path ? `${IMG}/w300${s.poster_path}` : null,
          overview: s.overview,
        })),
        createdBy: (data.created_by || []).map((c) => ({
          id: c.id,
          name: c.name,
          imageUrl: c.profile_path ? `${IMG}/w185${c.profile_path}` : null,
        })),
        networks: (data.networks || []).map((n) => ({
          id: n.id,
          name: n.name,
          logoUrl: n.logo_path ? `${IMG}/w154${n.logo_path}` : null,
        })),
        lastEpisode: data.last_episode_to_air || null,
        nextEpisode: data.next_episode_to_air || null,
        keywords: data.keywords?.results || [],
        backdrops:
          data.images?.backdrops?.slice(0, 12).map((b) => `${IMG}/w1280${b.file_path}`) || [],
        ...normalizeCredits(data.credits),
        trailer: pickTrailer(data.videos?.results),
        videos: (data.videos?.results || []).filter((v) => v.site === "YouTube").slice(0, 8),
        similar: (data.similar?.results || []).map((m) => normalizeMovie(m, "series")),
        recommendations: (data.recommendations?.results || []).map((m) =>
          normalizeMovie(m, "series"),
        ),
        watchProviders: normalizeWatchProviders(
          data["watch/providers"],
          (req.query.region as string) || "US",
        ),
        omdb,
      });
    } catch (e) {
      console.error("[tmdb] series detail", e);
      res.status(502).json({ message: "TMDB upstream failed" });
    }
  });

  // Season detail with episode list.
  app.get("/api/tmdb/season/:id/:season", async (req, res) => {
    try {
      const data = await tmdbFetch<{
        id: number;
        name: string;
        overview: string;
        air_date?: string;
        season_number: number;
        poster_path: string | null;
        episodes?: Array<{
          id: number;
          name: string;
          overview: string;
          air_date?: string;
          episode_number: number;
          season_number: number;
          runtime?: number;
          still_path: string | null;
          vote_average?: number;
        }>;
      }>(`/tv/${req.params.id}/season/${req.params.season}`, {
        language: (req.query.language as string) || undefined,
      });
      res.json({
        id: data.id,
        name: data.name,
        overview: data.overview,
        airDate: data.air_date || null,
        seasonNumber: data.season_number,
        posterUrl: data.poster_path ? `${IMG}/w500${data.poster_path}` : null,
        episodes: (data.episodes || []).map((e) => ({
          id: e.id,
          name: e.name,
          overview: e.overview,
          airDate: e.air_date || null,
          episodeNumber: e.episode_number,
          seasonNumber: e.season_number,
          runtime: e.runtime ?? null,
          stillUrl: e.still_path ? `${IMG}/w500${e.still_path}` : null,
          rating: e.vote_average ?? null,
        })),
      });
    } catch (e) {
      console.error("[tmdb] season", e);
      res.status(502).json({ message: "TMDB upstream failed" });
    }
  });

  app.get("/api/tmdb/episode/:id/:season/:episode", async (req, res) => {
    try {
      const data = await tmdbFetch<{
        id: number;
        name: string;
        overview: string;
        air_date?: string;
        episode_number: number;
        season_number: number;
        runtime?: number;
        still_path: string | null;
        vote_average?: number;
      }>(
        `/tv/${req.params.id}/season/${req.params.season}/episode/${req.params.episode}`,
      );
      res.json({
        id: data.id,
        name: data.name,
        overview: data.overview,
        airDate: data.air_date || null,
        episodeNumber: data.episode_number,
        seasonNumber: data.season_number,
        runtime: data.runtime ?? null,
        stillUrl: data.still_path ? `${IMG}/w500${data.still_path}` : null,
        rating: data.vote_average ?? null,
      });
    } catch (e) {
      console.error("[tmdb] episode", e);
      res.status(502).json({ message: "TMDB upstream failed" });
    }
  });

  // Person detail with combined movie + tv credits, sorted by popularity.
  app.get("/api/tmdb/person/:id", async (req, res) => {
    try {
      const data = await tmdbFetch<{
        id: number;
        name: string;
        biography: string;
        birthday?: string | null;
        deathday?: string | null;
        place_of_birth?: string | null;
        profile_path: string | null;
        known_for_department?: string;
        also_known_as?: string[];
        homepage?: string;
        external_ids?: { imdb_id?: string | null };
        combined_credits?: {
          cast?: Array<TmdbBase & { character?: string; media_type?: string }>;
          crew?: Array<TmdbBase & { job?: string; media_type?: string }>;
        };
        images?: { profiles?: { file_path: string }[] };
      }>(`/person/${req.params.id}`, {
        append_to_response: "combined_credits,external_ids,images",
      });
      const cast = (data.combined_credits?.cast || [])
        .filter((c) => c.poster_path)
        .map((c) => ({
          ...normalizeMovie(c, c.media_type === "tv" ? "series" : "movie"),
          character: c.character || null,
        }))
        .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));

      res.json({
        id: data.id,
        tmdbId: data.id,
        name: data.name,
        biography: data.biography || "",
        birthday: data.birthday || null,
        deathday: data.deathday || null,
        placeOfBirth: data.place_of_birth || null,
        knownForDepartment: data.known_for_department || null,
        alsoKnownAs: data.also_known_as || [],
        homepage: data.homepage || null,
        imageUrl: data.profile_path ? `${IMG}/h632${data.profile_path}` : null,
        imdbId: data.external_ids?.imdb_id || null,
        gallery: (data.images?.profiles || [])
          .slice(0, 12)
          .map((p) => `${IMG}/w300${p.file_path}`),
        credits: cast,
      });
    } catch (e) {
      console.error("[tmdb] person", e);
      res.status(502).json({ message: "TMDB upstream failed" });
    }
  });

  app.get("/api/tmdb/collection/:id", async (req, res) => {
    try {
      const data = await tmdbFetch<{
        id: number;
        name: string;
        overview: string;
        backdrop_path: string | null;
        poster_path: string | null;
        parts: Array<{
          id: number;
          title: string;
          overview: string;
          poster_path: string | null;
          backdrop_path: string | null;
          release_date: string;
          vote_average: number;
        }>;
      }>(`/collection/${req.params.id}`, {});
      res.json(data);
    } catch (e) {
      console.error("[tmdb] collection", e);
      res.status(502).json({ message: "TMDB upstream failed" });
    }
  });

  app.get("/api/tmdb/keyword/:id", async (req, res) => {
    try {
      const kind = (req.query.kind as string) === "tv" ? "tv" : "movie";
      const data = await tmdbFetch<{ results: TmdbBase[]; total_pages?: number }>(
        `/keyword/${req.params.id}/movies`,
        { page: (req.query.page as string) || "1" },
      );
      res.json({
        results: (data.results || []).map((m) =>
          normalizeMovie(m, kind === "tv" ? "series" : "movie"),
        ),
        totalPages: data.total_pages ?? 1,
      });
    } catch (e) {
      console.error("[tmdb] keyword", e);
      res.status(502).json({ message: "TMDB upstream failed" });
    }
  });
}
