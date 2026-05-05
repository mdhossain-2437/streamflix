// Client-side fetch interceptor for the static (no-backend) deployment.
//
// When VITE_TMDB_API_KEY is set at build time, requests to /api/tmdb/* are
// transparently proxied to api.themoviedb.org. The client code stays
// completely unchanged — no special-cases at call sites. Same for OMDB.
//
// AI endpoints (/api/ai/*) return 503 in static mode (no key safe to expose
// in browser) so the UI shows graceful "AI features available in full
// deployment" placeholders.
//
// Watchlist + viewing progress persist to localStorage so they survive
// page reloads on a single device.

import { queryClient } from "./queryClient";

const TMDB_API_KEY = (import.meta.env as Record<string, string>).VITE_TMDB_API_KEY;
const OMDB_API_KEY = (import.meta.env as Record<string, string>).VITE_OMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p";
const OMDB_BASE = "https://www.omdbapi.com";

const LS_WATCHLIST = "streamflix.watchlist";
const LS_PROGRESS = "streamflix.progress";

interface MockUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

const MOCK_USER: MockUser = {
  id: "demo-user",
  email: "viewer@streamflix.io",
  firstName: "Stream",
  lastName: "Viewer",
  profileImageUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode — ignore */
  }
}

function mockResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ────────────────────────────────────────────────────────────────────────
// Minimal inline mock catalog. Used only when TMDB key isn't configured at
// build time, so the app still has *something* to display offline.
// ────────────────────────────────────────────────────────────────────────
interface MockItem {
  id: string;
  tmdbId: number;
  type: "movie" | "series";
  title: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  thumbnailUrl: string;
  rating: number;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  year: string;
  durationMin: number | null;
  seasons: number | null;
  episodes: number | null;
  genres: string[];
  genreIds: number[];
  originalLanguage: string;
  adult: boolean;
}

function mk(
  tmdbId: number,
  type: "movie" | "series",
  title: string,
  description: string,
  imgSlug: string,
  rating: number,
  year: string,
  genres: string[],
  duration: number | null = null,
  seasons: number | null = null,
): MockItem {
  return {
    id: `tmdb-${type}-${tmdbId}`,
    tmdbId,
    type,
    title,
    description,
    posterUrl: `https://images.unsplash.com/photo-${imgSlug}?w=500&h=750&fit=crop`,
    backdropUrl: `https://images.unsplash.com/photo-${imgSlug}?w=1920&h=1080&fit=crop`,
    thumbnailUrl: `https://images.unsplash.com/photo-${imgSlug}?w=780&h=440&fit=crop`,
    rating,
    voteAverage: rating * 2,
    voteCount: 12_345,
    popularity: 100 - tmdbId,
    year,
    durationMin: duration,
    seasons,
    episodes: seasons ? seasons * 8 : null,
    genres,
    genreIds: [],
    originalLanguage: "en",
    adult: false,
  };
}

const MOCK_CATALOG: MockItem[] = [
  mk(1001, "movie", "The Quantum Paradox", "A physicist bends time and pays the price.", "1536440136628-849c177e76a1", 4.4, "2024", ["Sci-Fi", "Thriller"], 142),
  mk(1002, "movie", "Midnight in Paris Redux", "A writer is whisked back to 1920s Paris.", "1499364615650-ec38552f4f34", 4.3, "2023", ["Romance", "Drama"], 118),
  mk(1003, "movie", "Crimson Sands", "An archaeologist uncovers a desert empire.", "1547036967-23d11aacaee0", 4.1, "2024", ["Action", "Adventure"], 134),
  mk(1004, "movie", "The Last Symphony", "A deaf composer fights to finish her masterpiece.", "1493225457124-a3eab25b1b35", 4.6, "2023", ["Drama", "Music"], 127),
  mk(1005, "movie", "Echoes of Tomorrow", "A girl discovers tomorrow's news today.", "1518709268805-4e9042af2176", 4.2, "2024", ["Sci-Fi", "Mystery"], 109),
  mk(1006, "movie", "Iron Bloom", "A botanist genetically engineers metal-blooded flowers.", "1490750967868-a8f8b65f88b1", 4.0, "2023", ["Sci-Fi", "Drama"], 121),
  mk(2001, "series", "Parallel Lines", "Detectives across realities hunt one killer.", "1485846234645-a62644f84728", 4.5, "2024", ["Drama", "Thriller"], null, 2),
  mk(2002, "series", "Founders' Code", "Inside a Bangalore unicorn's first year.", "1522869635100-9f4c5e86aa37", 4.4, "2024", ["Drama"], null, 1),
  mk(2003, "series", "Empire of Sand", "Royal heirs play a deadly game of thrones.", "1518495973542-4542c06a5843", 4.3, "2024", ["Drama", "Action"], null, 1),
  mk(2004, "series", "Midnight Diner", "A diner that materializes in different cities.", "1517604931442-7e0c8ed2963c", 4.3, "2025", ["Drama", "Mystery"], null, 2),
];

// ────────────────────────────────────────────────────────────────────────
// TMDB direct passthrough (used when TMDB_API_KEY is baked in at build time)
// ────────────────────────────────────────────────────────────────────────

interface TmdbBase {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
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
  profile_path?: string | null;
  character?: string;
  job?: string;
}

function img(path: string | null | undefined, size: string): string | null {
  return path ? `${TMDB_IMG}/${size}${path}` : null;
}

function normalize(m: TmdbBase, kind: "movie" | "series") {
  const inferredKind: "movie" | "series" =
    m.media_type === "tv" || m.first_air_date || m.number_of_seasons ? "series" : kind;
  return {
    id: `tmdb-${inferredKind}-${m.id}`,
    tmdbId: m.id,
    type: inferredKind,
    title: m.title || m.name || "Untitled",
    description: m.overview || "",
    posterUrl: img(m.poster_path, "w500"),
    backdropUrl: img(m.backdrop_path, "original"),
    thumbnailUrl: img(m.backdrop_path, "w780") || img(m.poster_path, "w500"),
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

interface TmdbVideoEntry {
  id?: string;
  key: string;
  name?: string;
  site: string;
  type?: string;
  official?: boolean;
}

interface TmdbCreditsRaw {
  cast?: Array<{ id: number; name: string; character?: string; profile_path?: string | null; order?: number }>;
  crew?: Array<{ id: number; name: string; job?: string; department?: string; profile_path?: string | null }>;
}

interface TmdbWatchProvidersRaw {
  results?: Record<string, {
    link?: string;
    flatrate?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
    rent?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
    buy?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
  }>;
}

function pickTrailer(videos: TmdbVideoEntry[] | undefined): TmdbVideoEntry | null {
  if (!videos || videos.length === 0) return null;
  const yt = videos.filter((v) => v.site === "YouTube");
  return (
    yt.find((v) => v.type === "Trailer" && v.official) ||
    yt.find((v) => v.type === "Trailer") ||
    yt.find((v) => v.type === "Teaser") ||
    yt[0] ||
    null
  );
}

function normalizeCredits(c: TmdbCreditsRaw | undefined) {
  if (!c) return { cast: [], crew: [], director: null };
  const cast = (c.cast || []).slice(0, 30).map((x) => ({
    id: x.id,
    name: x.name,
    character: x.character || "",
    imageUrl: img(x.profile_path, "w185"),
  }));
  const crew = (c.crew || []).map((x) => ({
    id: x.id,
    name: x.name,
    job: x.job || "",
    department: x.department || "",
    imageUrl: img(x.profile_path, "w185"),
  }));
  return { cast, crew, director: crew.find((c2) => c2.job === "Director")?.name || null };
}

function normalizeWatchProviders(p: TmdbWatchProvidersRaw | undefined, region = "US") {
  const r = p?.results?.[region];
  if (!r) return null;
  const norm = (
    arr?: Array<{ provider_id: number; provider_name: string; logo_path: string }>,
  ) =>
    (arr || []).map((x) => ({
      id: x.provider_id,
      name: x.provider_name,
      logoUrl: x.logo_path ? `${TMDB_IMG}/w92${x.logo_path}` : null,
    }));
  return {
    link: r.link || null,
    stream: norm(r.flatrate),
    rent: norm(r.rent),
    buy: norm(r.buy),
  };
}

const tmdbCache = new Map<string, { data: unknown; ts: number; ttl: number }>();
const TMDB_TTL = 30 * 60 * 1000;
const SEARCH_TTL = 5 * 60 * 1000;

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}, ttl = TMDB_TTL): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", TMDB_API_KEY!);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  const key = url.toString();
  const cached = tmdbCache.get(key);
  if (cached && Date.now() - cached.ts < cached.ttl) return cached.data as T;
  const res = await fetch(key);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  const data = (await res.json()) as T;
  tmdbCache.set(key, { data, ts: Date.now(), ttl });
  return data;
}

async function handleTmdbProxy(url: URL): Promise<Response | null> {
  if (!TMDB_API_KEY) return null;
  const path = url.pathname;
  const sp = url.searchParams;

  try {
    if (path === "/api/tmdb/configuration") {
      const data = await tmdbFetch("/configuration", {}, 24 * 60 * 60 * 1000);
      return mockResponse(data);
    }
    if (path === "/api/tmdb/genres") {
      const kind = sp.get("kind") === "tv" ? "tv" : "movie";
      const data = await tmdbFetch<{ genres: { id: number; name: string }[] }>(
        `/genre/${kind}/list`,
      );
      return mockResponse(data.genres);
    }

    if (path === "/api/tmdb/trending") {
      const window = sp.get("window") === "day" ? "day" : "week";
      const kind = sp.get("kind") || "all";
      const tmdbKind = kind === "tv" ? "tv" : kind === "movie" ? "movie" : "all";
      const data = await tmdbFetch<{ results: TmdbBase[]; total_pages?: number }>(
        `/trending/${tmdbKind}/${window}`,
        { page: sp.get("page") || "1" },
      );
      return mockResponse({
        results: (data.results || []).map((m) => normalize(m, kind === "tv" ? "series" : "movie")),
        totalPages: data.total_pages ?? 1,
      });
    }

    type ListConfig = { tmdbPath: string; kind: "movie" | "series" };
    const listMap: Record<string, ListConfig> = {
      "/api/tmdb/popular": { tmdbPath: "popular", kind: "movie" },
      "/api/tmdb/top-rated": { tmdbPath: "top_rated", kind: "movie" },
      "/api/tmdb/now-playing": { tmdbPath: "now_playing", kind: "movie" },
      "/api/tmdb/upcoming": { tmdbPath: "upcoming", kind: "movie" },
      "/api/tmdb/on-the-air": { tmdbPath: "on_the_air", kind: "series" },
      "/api/tmdb/airing-today": { tmdbPath: "airing_today", kind: "series" },
    };
    if (path in listMap) {
      const cfg = listMap[path];
      const tvOrMovie = sp.get("kind") === "tv" || cfg.kind === "series" ? "tv" : "movie";
      // popular/top-rated take a kind param; others are fixed
      const fixedTv = ["/api/tmdb/on-the-air", "/api/tmdb/airing-today"].includes(path);
      const fixedMovie = ["/api/tmdb/now-playing", "/api/tmdb/upcoming"].includes(path);
      const actualKind = fixedTv ? "tv" : fixedMovie ? "movie" : tvOrMovie;
      const data = await tmdbFetch<{ results: TmdbBase[]; total_pages?: number }>(
        `/${actualKind}/${cfg.tmdbPath}`,
        { page: sp.get("page") || "1" },
      );
      return mockResponse({
        results: (data.results || []).map((m) => normalize(m, actualKind === "tv" ? "series" : "movie")),
        totalPages: data.total_pages ?? 1,
      });
    }

    if (path === "/api/tmdb/discover") {
      const kind = sp.get("kind") === "tv" ? "tv" : "movie";
      const out: Record<string, string> = {
        sort_by: sp.get("sort") || "popularity.desc",
        page: sp.get("page") || "1",
        include_adult: sp.get("includeAdult") || "false",
      };
      if (sp.get("genre")) out.with_genres = sp.get("genre")!;
      if (sp.get("withoutGenres")) out.without_genres = sp.get("withoutGenres")!;
      if (sp.get("keyword")) out.with_keywords = sp.get("keyword")!;
      if (sp.get("person")) out.with_people = sp.get("person")!;
      if (sp.get("cast")) out.with_cast = sp.get("cast")!;
      if (sp.get("lang")) out.with_original_language = sp.get("lang")!;
      if (sp.get("region")) out.region = sp.get("region")!;
      if (sp.get("minRating")) out["vote_average.gte"] = sp.get("minRating")!;
      if (sp.get("minVotes")) out["vote_count.gte"] = sp.get("minVotes")!;
      if (sp.get("minRuntime")) out["with_runtime.gte"] = sp.get("minRuntime")!;
      if (sp.get("maxRuntime")) out["with_runtime.lte"] = sp.get("maxRuntime")!;
      if (sp.get("year")) {
        if (kind === "movie") out.primary_release_year = sp.get("year")!;
        else out.first_air_date_year = sp.get("year")!;
      }
      const data = await tmdbFetch<{ results: TmdbBase[]; total_pages?: number }>(
        `/discover/${kind}`,
        out,
      );
      return mockResponse({
        results: (data.results || []).map((m) => normalize(m, kind === "tv" ? "series" : "movie")),
        totalPages: data.total_pages ?? 1,
      });
    }

    if (path === "/api/tmdb/search") {
      const q = sp.get("q") || "";
      const kind = sp.get("kind") || "multi";
      if (!q.trim()) return mockResponse({ results: [], totalPages: 0 });
      const tmdbPath =
        kind === "movie" || kind === "tv" || kind === "person"
          ? `/search/${kind}`
          : "/search/multi";
      const data = await tmdbFetch<{ results: Array<TmdbBase & { name?: string }>; total_pages?: number }>(
        tmdbPath,
        {
          query: q,
          page: sp.get("page") || "1",
          include_adult: sp.get("includeAdult") || "false",
        },
        SEARCH_TTL,
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
              imageUrl: img(m.profile_path, "w185"),
              popularity: m.popularity ?? null,
            };
          }
          return normalize(m, m.media_type === "tv" ? "series" : "movie");
        });
      return mockResponse({ results, totalPages: data.total_pages ?? 1 });
    }

    const movieMatch = path.match(/^\/api\/tmdb\/movie\/(\d+)$/);
    if (movieMatch) {
      const data = await tmdbFetch<TmdbBase & {
        credits?: TmdbCreditsRaw;
        videos?: { results?: TmdbVideoEntry[] };
        similar?: { results?: TmdbBase[] };
        recommendations?: { results?: TmdbBase[] };
        keywords?: { keywords?: { id: number; name: string }[] };
        external_ids?: { imdb_id?: string };
        "watch/providers"?: TmdbWatchProvidersRaw;
        images?: { backdrops?: { file_path: string }[] };
        tagline?: string; status?: string; budget?: number; revenue?: number; homepage?: string;
        production_companies?: { id: number; name: string; logo_path: string | null }[];
        production_countries?: { iso_3166_1: string; name: string }[];
        spoken_languages?: { iso_639_1: string; english_name: string }[];
      }>(`/movie/${movieMatch[1]}`, {
        append_to_response:
          "credits,videos,similar,recommendations,images,keywords,external_ids,watch/providers",
        include_image_language: "en,null",
      });
      const omdb = data.external_ids?.imdb_id ? await fetchOmdbDirect(data.external_ids.imdb_id) : null;
      return mockResponse({
        ...normalize(data, "movie"),
        tagline: data.tagline ?? null,
        status: data.status ?? null,
        budget: data.budget ?? null,
        revenue: data.revenue ?? null,
        homepage: data.homepage ?? null,
        imdbId: data.external_ids?.imdb_id ?? null,
        production: (data.production_companies || []).map((c) => ({
          id: c.id, name: c.name, logoUrl: c.logo_path ? `${TMDB_IMG}/w154${c.logo_path}` : null,
        })),
        countries: data.production_countries || [],
        spokenLanguages: data.spoken_languages || [],
        keywords: data.keywords?.keywords || [],
        backdrops: (data.images?.backdrops || []).slice(0, 12).map((b) => `${TMDB_IMG}/w1280${b.file_path}`),
        ...normalizeCredits(data.credits),
        trailer: pickTrailer(data.videos?.results),
        videos: (data.videos?.results || []).filter((v) => v.site === "YouTube").slice(0, 8),
        similar: (data.similar?.results || []).map((m) => normalize(m, "movie")),
        recommendations: (data.recommendations?.results || []).map((m) => normalize(m, "movie")),
        watchProviders: normalizeWatchProviders(data["watch/providers"], sp.get("region") || "US"),
        omdb,
      });
    }

    const seriesMatch = path.match(/^\/api\/tmdb\/series\/(\d+)$/);
    if (seriesMatch) {
      const data = await tmdbFetch<TmdbBase & {
        credits?: TmdbCreditsRaw;
        videos?: { results?: TmdbVideoEntry[] };
        similar?: { results?: TmdbBase[] };
        recommendations?: { results?: TmdbBase[] };
        keywords?: { results?: { id: number; name: string }[] };
        external_ids?: { imdb_id?: string };
        "watch/providers"?: TmdbWatchProvidersRaw;
        images?: { backdrops?: { file_path: string }[] };
        tagline?: string; status?: string; homepage?: string;
        seasons?: Array<{ id: number; season_number: number; name: string; episode_count: number; air_date?: string; poster_path: string | null; overview: string }>;
        created_by?: Array<{ id: number; name: string; profile_path: string | null }>;
        networks?: Array<{ id: number; name: string; logo_path: string | null }>;
      }>(`/tv/${seriesMatch[1]}`, {
        append_to_response:
          "credits,videos,similar,recommendations,images,keywords,external_ids,watch/providers",
        include_image_language: "en,null",
      });
      const omdb = data.external_ids?.imdb_id ? await fetchOmdbDirect(data.external_ids.imdb_id) : null;
      return mockResponse({
        ...normalize(data, "series"),
        tagline: data.tagline ?? null,
        status: data.status ?? null,
        homepage: data.homepage ?? null,
        imdbId: data.external_ids?.imdb_id ?? null,
        seasonCount: data.number_of_seasons ?? null,
        episodeCount: data.number_of_episodes ?? null,
        seasonsList: (data.seasons || []).map((s) => ({
          id: s.id, number: s.season_number, name: s.name, episodeCount: s.episode_count,
          airDate: s.air_date || null, posterUrl: s.poster_path ? `${TMDB_IMG}/w300${s.poster_path}` : null,
          overview: s.overview,
        })),
        createdBy: (data.created_by || []).map((c) => ({
          id: c.id, name: c.name, imageUrl: c.profile_path ? `${TMDB_IMG}/w185${c.profile_path}` : null,
        })),
        networks: (data.networks || []).map((n) => ({
          id: n.id, name: n.name, logoUrl: n.logo_path ? `${TMDB_IMG}/w154${n.logo_path}` : null,
        })),
        keywords: data.keywords?.results || [],
        backdrops: (data.images?.backdrops || []).slice(0, 12).map((b) => `${TMDB_IMG}/w1280${b.file_path}`),
        ...normalizeCredits(data.credits),
        trailer: pickTrailer(data.videos?.results),
        videos: (data.videos?.results || []).filter((v) => v.site === "YouTube").slice(0, 8),
        similar: (data.similar?.results || []).map((m) => normalize(m, "series")),
        recommendations: (data.recommendations?.results || []).map((m) => normalize(m, "series")),
        watchProviders: normalizeWatchProviders(data["watch/providers"], sp.get("region") || "US"),
        omdb,
      });
    }

    const seasonMatch = path.match(/^\/api\/tmdb\/season\/(\d+)\/(\d+)$/);
    if (seasonMatch) {
      const data = await tmdbFetch<{
        id: number; name: string; overview: string; air_date?: string; season_number: number; poster_path: string | null;
        episodes?: Array<{ id: number; name: string; overview: string; air_date?: string; episode_number: number; season_number: number; runtime?: number; still_path: string | null; vote_average?: number }>;
      }>(`/tv/${seasonMatch[1]}/season/${seasonMatch[2]}`);
      return mockResponse({
        id: data.id, name: data.name, overview: data.overview,
        airDate: data.air_date || null, seasonNumber: data.season_number,
        posterUrl: data.poster_path ? `${TMDB_IMG}/w500${data.poster_path}` : null,
        episodes: (data.episodes || []).map((e) => ({
          id: e.id, name: e.name, overview: e.overview, airDate: e.air_date || null,
          episodeNumber: e.episode_number, seasonNumber: e.season_number,
          runtime: e.runtime ?? null, stillUrl: e.still_path ? `${TMDB_IMG}/w500${e.still_path}` : null,
          rating: e.vote_average ?? null,
        })),
      });
    }

    const personMatch = path.match(/^\/api\/tmdb\/person\/(\d+)$/);
    if (personMatch) {
      const data = await tmdbFetch<{
        id: number; name: string; biography: string; birthday?: string | null; deathday?: string | null;
        place_of_birth?: string | null; profile_path: string | null; known_for_department?: string;
        also_known_as?: string[]; homepage?: string; external_ids?: { imdb_id?: string | null };
        combined_credits?: { cast?: Array<TmdbBase & { character?: string; media_type?: string }> };
        images?: { profiles?: { file_path: string }[] };
      }>(`/person/${personMatch[1]}`, { append_to_response: "combined_credits,external_ids,images" });
      const cast = (data.combined_credits?.cast || [])
        .filter((c) => c.poster_path)
        .map((c) => ({
          ...normalize(c, c.media_type === "tv" ? "series" : "movie"),
          character: c.character || null,
        }))
        .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
      return mockResponse({
        id: data.id, tmdbId: data.id, name: data.name, biography: data.biography || "",
        birthday: data.birthday || null, deathday: data.deathday || null,
        placeOfBirth: data.place_of_birth || null, knownForDepartment: data.known_for_department || null,
        alsoKnownAs: data.also_known_as || [], homepage: data.homepage || null,
        imageUrl: data.profile_path ? `${TMDB_IMG}/h632${data.profile_path}` : null,
        imdbId: data.external_ids?.imdb_id || null,
        gallery: (data.images?.profiles || []).slice(0, 12).map((p) => `${TMDB_IMG}/w300${p.file_path}`),
        credits: cast,
      });
    }
  } catch (err) {
    console.error("[demoMock] TMDB proxy failed:", err);
    return mockResponse({ message: "TMDB upstream failed" }, 502);
  }

  return null;
}

// OMDB direct passthrough — used both for the dedicated endpoint and for
// movie/series detail enrichment.
const omdbCache = new Map<string, unknown>();
async function fetchOmdbDirect(imdbId: string): Promise<unknown> {
  if (!OMDB_API_KEY || !imdbId) return null;
  if (omdbCache.has(imdbId)) return omdbCache.get(imdbId);
  try {
    const url = new URL(OMDB_BASE);
    url.searchParams.set("apikey", OMDB_API_KEY);
    url.searchParams.set("i", imdbId);
    url.searchParams.set("plot", "short");
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const raw = (await res.json()) as Record<string, string | undefined> & { Ratings?: { Source: string; Value: string }[]; Response?: string };
    if (raw.Response === "False") return null;
    const ratings = raw.Ratings || [];
    const rt = ratings.find((r: { Source: string; Value: string }) => r.Source === "Rotten Tomatoes")?.Value;
    const result = {
      imdbRating: raw.imdbRating ? Number(raw.imdbRating) : null,
      imdbVotes: raw.imdbVotes && raw.imdbVotes !== "N/A" ? raw.imdbVotes : null,
      rottenTomatoes: rt ? Number((rt.match(/(\d+)%/) || [])[1] ?? NaN) : null,
      metascore: raw.Metascore ? Number(raw.Metascore) : null,
      awards: raw.Awards && raw.Awards !== "N/A" ? raw.Awards : null,
      boxOffice: raw.BoxOffice && raw.BoxOffice !== "N/A" ? raw.BoxOffice : null,
      rated: raw.Rated && raw.Rated !== "N/A" ? raw.Rated : null,
      released: raw.Released && raw.Released !== "N/A" ? raw.Released : null,
      director: raw.Director && raw.Director !== "N/A" ? raw.Director : null,
      writer: raw.Writer && raw.Writer !== "N/A" ? raw.Writer : null,
      language: raw.Language && raw.Language !== "N/A" ? raw.Language : null,
      country: raw.Country && raw.Country !== "N/A" ? raw.Country : null,
    };
    omdbCache.set(imdbId, result);
    return result;
  } catch (err) {
    console.error("[demoMock] OMDB fetch failed:", err);
    return null;
  }
}

async function handleOmdbProxy(url: URL): Promise<Response | null> {
  if (url.pathname === "/api/omdb/status") {
    return mockResponse({ configured: !!OMDB_API_KEY });
  }
  if (!OMDB_API_KEY) return null;
  const m = url.pathname.match(/^\/api\/omdb\/by-imdb\/(.+)$/);
  if (m) {
    const data = await fetchOmdbDirect(m[1]);
    if (!data) return mockResponse({ message: "Not found" }, 404);
    return mockResponse(data);
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────
// Mock-only routes: TMDB-shaped fallback when no API key is baked in.
// ────────────────────────────────────────────────────────────────────────
function mockListResponse(items: MockItem[]): Response {
  return mockResponse({ results: items, totalPages: 1 });
}

function handleTmdbMockFallback(url: URL): Response | null {
  const path = url.pathname;
  const sp = url.searchParams;
  const kind = sp.get("kind") === "tv" ? "series" : "movie";

  if (path === "/api/tmdb/configuration") {
    return mockResponse({
      images: { secure_base_url: TMDB_IMG, poster_sizes: ["w300", "w500", "w780"], backdrop_sizes: ["w780", "w1280", "original"] },
    });
  }
  if (path === "/api/tmdb/genres") {
    return mockResponse([
      { id: 28, name: "Action" }, { id: 12, name: "Adventure" }, { id: 16, name: "Animation" },
      { id: 35, name: "Comedy" }, { id: 80, name: "Crime" }, { id: 18, name: "Drama" },
      { id: 14, name: "Fantasy" }, { id: 27, name: "Horror" }, { id: 9648, name: "Mystery" },
      { id: 10749, name: "Romance" }, { id: 878, name: "Sci-Fi" }, { id: 53, name: "Thriller" },
    ]);
  }
  if (path === "/api/tmdb/trending") {
    return mockListResponse(MOCK_CATALOG);
  }
  if (path === "/api/tmdb/popular" || path === "/api/tmdb/top-rated") {
    return mockListResponse(MOCK_CATALOG.filter((c) => c.type === kind));
  }
  if (
    path === "/api/tmdb/now-playing" ||
    path === "/api/tmdb/upcoming"
  ) {
    return mockListResponse(MOCK_CATALOG.filter((c) => c.type === "movie"));
  }
  if (path === "/api/tmdb/on-the-air" || path === "/api/tmdb/airing-today") {
    return mockListResponse(MOCK_CATALOG.filter((c) => c.type === "series"));
  }
  if (path === "/api/tmdb/discover") {
    let items = MOCK_CATALOG.filter((c) => c.type === kind);
    const sort = sp.get("sort") || "popularity.desc";
    if (sort.startsWith("vote_average")) items = items.sort((a, b) => b.rating - a.rating);
    else if (sort.startsWith("primary_release_date") || sort.startsWith("first_air_date"))
      items = items.sort((a, b) => Number(b.year) - Number(a.year));
    else if (sort.startsWith("original_title")) items = items.sort((a, b) => a.title.localeCompare(b.title));
    return mockListResponse(items);
  }
  if (path === "/api/tmdb/search") {
    const q = (sp.get("q") || "").toLowerCase();
    if (!q) return mockResponse({ results: [], totalPages: 0 });
    return mockListResponse(
      MOCK_CATALOG.filter((c) => c.title.toLowerCase().includes(q) || c.genres.some((g) => g.toLowerCase().includes(q))),
    );
  }

  const detailMatch = path.match(/^\/api\/tmdb\/(movie|series)\/(\d+)$/);
  if (detailMatch) {
    const id = `tmdb-${detailMatch[1]}-${detailMatch[2]}`;
    const item = MOCK_CATALOG.find((c) => c.id === id) || MOCK_CATALOG[0];
    return mockResponse({
      ...item,
      tagline: null, status: "Released", budget: null, revenue: null, homepage: null,
      imdbId: null, production: [], countries: [], spokenLanguages: [], keywords: [],
      backdrops: [item.backdropUrl],
      cast: [], crew: [], director: null,
      trailer: null, videos: [],
      similar: MOCK_CATALOG.filter((c) => c.type === item.type && c.id !== item.id).slice(0, 6),
      recommendations: MOCK_CATALOG.filter((c) => c.id !== item.id).slice(0, 6),
      watchProviders: null, omdb: null,
    });
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────
// Watchlist & viewing progress (localStorage-backed)
// ────────────────────────────────────────────────────────────────────────
function handleWatchlist(url: URL, init: RequestInit | undefined, method: string): Response | null {
  const wl = loadJson<string[]>(LS_WATCHLIST, []);

  if (method === "GET" && url.pathname === "/api/watchlist") {
    return mockResponse(wl.map((id) => ({ contentId: id, addedAt: new Date().toISOString() })));
  }
  const check = url.pathname.match(/^\/api\/watchlist\/check\/(.+)$/);
  if (method === "GET" && check) {
    return mockResponse(wl.includes(decodeURIComponent(check[1])));
  }
  if (method === "POST" && url.pathname === "/api/watchlist") {
    try {
      const body = JSON.parse(init?.body as string) as { contentId?: string };
      if (body.contentId && !wl.includes(body.contentId)) {
        wl.push(body.contentId);
        saveJson(LS_WATCHLIST, wl);
      }
    } catch { /* ignore */ }
    return mockResponse({ success: true });
  }
  if (method === "DELETE" && url.pathname.startsWith("/api/watchlist/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop() || "");
    saveJson(LS_WATCHLIST, wl.filter((x) => x !== id));
    return mockResponse({ success: true });
  }
  return null;
}

interface ProgressEntry {
  contentId: string;
  progressSeconds: number;
  durationSeconds: number;
  completed: boolean;
  lastWatchedAt: string;
}

function handleProgress(url: URL, init: RequestInit | undefined, method: string): Response | null {
  const progress = loadJson<Record<string, ProgressEntry>>(LS_PROGRESS, {});

  if (method === "GET" && url.pathname === "/api/continue-watching") {
    const list = Object.values(progress)
      .filter((p) => !p.completed && p.progressSeconds > 30)
      .sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime());
    return mockResponse(list);
  }
  const byId = url.pathname.match(/^\/api\/viewing-progress\/(.+)$/);
  if (method === "GET" && byId) {
    return mockResponse(progress[decodeURIComponent(byId[1])] || null);
  }
  if (method === "POST" && url.pathname === "/api/viewing-progress") {
    try {
      const body = JSON.parse(init?.body as string) as Partial<ProgressEntry>;
      if (body.contentId && body.progressSeconds !== undefined && body.durationSeconds !== undefined) {
        progress[body.contentId] = {
          contentId: body.contentId,
          progressSeconds: body.progressSeconds,
          durationSeconds: body.durationSeconds,
          completed: body.progressSeconds / Math.max(body.durationSeconds, 1) > 0.9,
          lastWatchedAt: new Date().toISOString(),
        };
        saveJson(LS_PROGRESS, progress);
      }
    } catch { /* ignore */ }
    return mockResponse({ success: true });
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────
// Top-level router
// ────────────────────────────────────────────────────────────────────────
const nativeFetch = window.fetch.bind(window);

async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlStr = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!urlStr.startsWith("/api/")) return nativeFetch(input, init);
  const url = new URL(urlStr, window.location.origin);
  const method = (init?.method || "GET").toUpperCase();

  // Status
  if (url.pathname === "/api/tmdb/status") {
    return mockResponse({
      configured: !!TMDB_API_KEY,
      omdb: !!OMDB_API_KEY,
      openai: false,
      mode: TMDB_API_KEY ? "v3-key" : "unconfigured",
    });
  }
  if (url.pathname === "/api/ai/status") {
    return mockResponse({ configured: false, model: null });
  }

  // AI endpoints — disabled in static deploy (keys aren't safe in browser)
  if (url.pathname.startsWith("/api/ai/")) {
    return mockResponse({ configured: false, message: "AI features available in full deployment" }, 503);
  }

  // Auth
  if (url.pathname === "/api/auth/user") return mockResponse(MOCK_USER);

  // Watchlist & progress
  const wl = handleWatchlist(url, init, method);
  if (wl) return wl;
  const prog = handleProgress(url, init, method);
  if (prog) return prog;

  // TMDB / OMDB
  if (url.pathname.startsWith("/api/tmdb/")) {
    const proxied = await handleTmdbProxy(url);
    if (proxied) return proxied;
    const fallback = handleTmdbMockFallback(url);
    if (fallback) return fallback;
  }
  if (url.pathname.startsWith("/api/omdb/")) {
    const proxied = await handleOmdbProxy(url);
    if (proxied) return proxied;
    return mockResponse({ message: "OMDB_API_KEY not configured" }, 503);
  }

  // Legacy /api/content/* routes — forward to /api/tmdb/* when possible.
  // Also keep working for the very old hardcoded mock IDs (like "movie-0")
  // that the previous demo used: just return null and let the network layer
  // eventually 404; modern code paths use TMDB IDs.
  if (url.pathname === "/api/content/featured") {
    const data = await tmdbFetch<{ results: TmdbBase[] }>("/movie/popular").catch(() => null);
    if (data?.results?.[0]) return mockResponse(normalize(data.results[0], "movie"));
    return mockResponse(MOCK_CATALOG[0]);
  }
  if (url.pathname === "/api/content/trending" || url.pathname.startsWith("/api/content")) {
    return mockListResponse(MOCK_CATALOG);
  }

  return nativeFetch(input, init);
}

export function installDemoMock(): void {
  (window as unknown as { fetch: typeof window.fetch }).fetch =
    mockFetch as unknown as typeof window.fetch;
}

export function primeDemoQueryCache(): void {
  queryClient.setQueryData(["/api/auth/user"], MOCK_USER);
}
