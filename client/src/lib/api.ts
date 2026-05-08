// Unified data layer hooks. Every page calls these — they internally route
// to /api/tmdb/*, /api/omdb/*, and /api/ai/* endpoints. The Express server
// proxies real APIs in dev. The static demoMock proxies the same endpoints
// to TMDB/OMDB *directly* (using VITE_TMDB_API_KEY at build time) so a
// statically deployed build still gets real data.
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

const STALE_LONG = 30 * 60 * 1000;
const STALE_SHORT = 5 * 60 * 1000;

// Eagerly fetch detail data into the React Query cache. Used by ContentCard's
// onMouseEnter so by the time the user clicks, the detail page hydrates from
// cache instead of waiting on a network round-trip. Cheap fire-and-forget.
export function prefetchContentDetail(
  type: "movie" | "series" | undefined,
  tmdbId: number | string | undefined,
): void {
  if (!type || tmdbId === undefined || tmdbId === null) return;
  const path = type === "series" ? "series" : "movie";
  const idStr = String(tmdbId);
  queryClient.prefetchQuery({
    queryKey: [`/api/tmdb/${path}/${idStr}`],
    queryFn: () => jsonOrNull(`/api/tmdb/${path}/${idStr}`),
    staleTime: STALE_LONG,
  });
}

export interface CatalogItem {
  id: string;
  tmdbId: number;
  type: "movie" | "series";
  title: string;
  description: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  thumbnailUrl: string | null;
  rating: number | null;
  voteAverage: number | null;
  voteCount: number | null;
  popularity: number | null;
  year: string;
  durationMin: number | null;
  seasons: number | null;
  episodes: number | null;
  genres: string[];
  genreIds: number[];
  originalLanguage: string | null;
  adult: boolean;
}

export interface PersonHit {
  type: "person";
  id: string;
  tmdbId: number;
  name: string;
  imageUrl: string | null;
  popularity: number | null;
}

export type SearchHit = CatalogItem | PersonHit;

export interface CastMember {
  id: number;
  name: string;
  character: string;
  imageUrl: string | null;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  imageUrl: string | null;
}

export interface TrailerVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface OmdbInfo {
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

export interface ContentDetail extends CatalogItem {
  tagline: string | null;
  status: string | null;
  imdbId: string | null;
  homepage: string | null;
  budget: number | null;
  revenue: number | null;
  cast: CastMember[];
  crew: CrewMember[];
  director: string | null;
  trailer: TrailerVideo | null;
  videos: TrailerVideo[];
  similar: CatalogItem[];
  recommendations: CatalogItem[];
  keywords: { id: number; name: string }[];
  backdrops: string[];
  production: { id: number; name: string; logoUrl: string | null }[];
  countries: { iso_3166_1: string; name: string }[];
  spokenLanguages: { iso_639_1: string; english_name: string }[];
  watchProviders: {
    link: string | null;
    stream: { id: number; name: string; logoUrl: string | null }[];
    rent: { id: number; name: string; logoUrl: string | null }[];
    buy: { id: number; name: string; logoUrl: string | null }[];
  } | null;
  omdb: OmdbInfo | null;
  // Series-only:
  seasonCount?: number | null;
  episodeCount?: number | null;
  seasonsList?: Array<{
    id: number;
    number: number;
    name: string;
    episodeCount: number;
    airDate: string | null;
    posterUrl: string | null;
    overview: string;
  }>;
  createdBy?: Array<{ id: number; name: string; imageUrl: string | null }>;
  networks?: Array<{ id: number; name: string; logoUrl: string | null }>;
}

export interface SeasonDetail {
  id: number;
  name: string;
  overview: string;
  airDate: string | null;
  seasonNumber: number;
  posterUrl: string | null;
  episodes: Array<{
    id: number;
    name: string;
    overview: string;
    airDate: string | null;
    episodeNumber: number;
    seasonNumber: number;
    runtime: number | null;
    stillUrl: string | null;
    rating: number | null;
  }>;
}

export interface PersonDetail {
  id: number;
  tmdbId: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  knownForDepartment: string | null;
  alsoKnownAs: string[];
  homepage: string | null;
  imageUrl: string | null;
  imdbId: string | null;
  gallery: string[];
  credits: Array<CatalogItem & { character: string | null }>;
}

export interface ServiceStatus {
  configured: boolean;
  omdb: boolean;
  openai: boolean;
  mode: string;
}

async function jsonOrNull<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { credentials: "include" });
  if (res.status === 503 || res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

async function jsonRequired<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export function useServiceStatus() {
  return useQuery<ServiceStatus>({
    queryKey: ["/api/tmdb/status"],
    queryFn: () => jsonRequired<ServiceStatus>("/api/tmdb/status"),
    staleTime: STALE_LONG,
  });
}

export type Kind = "movie" | "tv";

export function useGenres(kind: Kind = "movie") {
  return useQuery<{ id: number; name: string }[] | null>({
    queryKey: ["/api/tmdb/genres", { kind }],
    queryFn: () => jsonOrNull(`/api/tmdb/genres?kind=${kind}`),
    staleTime: 24 * 60 * 60 * 1000,
  });
}

interface ListResponse {
  results: CatalogItem[];
  totalPages: number;
}

function listHook(
  endpoint: string,
  defaultParams: Record<string, string | undefined> = {},
) {
  return (
    params: Record<string, string | number | undefined> = {},
    enabled = true,
  ) => {
    const merged = { ...defaultParams } as Record<string, string | undefined>;
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") merged[k] = String(v);
    }
    const qs = new URLSearchParams(
      Object.entries(merged).filter(([, v]) => v !== undefined) as [string, string][],
    ).toString();
    const url = qs ? `${endpoint}?${qs}` : endpoint;
    return useQuery<ListResponse | null>({
      queryKey: [endpoint, merged],
      queryFn: () => jsonOrNull<ListResponse>(url),
      staleTime: STALE_LONG,
      enabled,
    });
  };
}

export const useTrending = listHook("/api/tmdb/trending");
export const usePopular = listHook("/api/tmdb/popular");
export const useTopRated = listHook("/api/tmdb/top-rated");
export const useNowPlaying = listHook("/api/tmdb/now-playing");
export const useUpcoming = listHook("/api/tmdb/upcoming");
export const useOnTheAir = listHook("/api/tmdb/on-the-air");
export const useAiringToday = listHook("/api/tmdb/airing-today");
export const useDiscover = listHook("/api/tmdb/discover");

export function useSearch(
  q: string,
  kind: "multi" | "movie" | "tv" | "person" = "multi",
  enabled = true,
) {
  return useQuery<{ results: SearchHit[]; totalPages: number } | null>({
    queryKey: ["/api/tmdb/search", { q, kind }],
    queryFn: () =>
      q.trim().length >= 2
        ? jsonOrNull(
            `/api/tmdb/search?q=${encodeURIComponent(q)}&kind=${kind}`,
          )
        : Promise.resolve({ results: [], totalPages: 0 }),
    enabled: enabled && q.trim().length >= 2,
    staleTime: STALE_SHORT,
  });
}

export function useContentDetail(
  type: "movie" | "series" | undefined,
  tmdbId: number | string | undefined,
) {
  const path = type === "series" ? "series" : "movie";
  const idStr = tmdbId !== undefined && tmdbId !== null ? String(tmdbId) : "";
  return useQuery<ContentDetail | null>({
    queryKey: [`/api/tmdb/${path}/${idStr}`],
    queryFn: () =>
      idStr ? jsonOrNull<ContentDetail>(`/api/tmdb/${path}/${idStr}`) : Promise.resolve(null),
    staleTime: STALE_LONG,
    enabled: !!tmdbId && !!type,
  });
}

export function useSeason(
  seriesTmdbId: number | string | undefined,
  seasonNumber: number | undefined,
) {
  return useQuery<SeasonDetail | null>({
    queryKey: [`/api/tmdb/season/${seriesTmdbId}/${seasonNumber}`],
    queryFn: () =>
      seriesTmdbId !== undefined && seasonNumber !== undefined
        ? jsonOrNull<SeasonDetail>(`/api/tmdb/season/${seriesTmdbId}/${seasonNumber}`)
        : Promise.resolve(null),
    staleTime: STALE_LONG,
    enabled: seriesTmdbId !== undefined && seasonNumber !== undefined,
  });
}

export function usePerson(personId: number | string | undefined) {
  return useQuery<PersonDetail | null>({
    queryKey: [`/api/tmdb/person/${personId}`],
    queryFn: () =>
      personId ? jsonOrNull<PersonDetail>(`/api/tmdb/person/${personId}`) : Promise.resolve(null),
    staleTime: STALE_LONG,
    enabled: !!personId,
  });
}

// ────────────────────────────────────────────────────────────────────────
// archive.org hooks — public-domain feature films with real streamable URLs.
// ────────────────────────────────────────────────────────────────────────

export interface ArchiveItem {
  id: string;            // "archive-<identifier>"
  identifier: string;
  type: "movie";
  title: string;
  description: string;
  year: string;
  durationMin: number | null;
  rating: number | null;
  genres: string[];
  posterUrl: string;
  backdropUrl: string | null;
  thumbnailUrl: string;
  source: "archive";
  detailsUrl: string;
}

export interface ArchivePlayableSource {
  url: string;
  type: string;
  label: string;
  size: number | null;
  duration: number | null;
}

export interface ArchiveItemDetail {
  item: ArchiveItem;
  sources: ArchivePlayableSource[];
  subtitles: Array<{ url: string; label: string; srclang: string }>;
  embedUrl: string;
  licenseUrl: string | null;
}

export interface ArchiveListResponse {
  items: ArchiveItem[];
  numFound: number;
}

export function useArchiveFeatured(params: { limit?: number; page?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.page) qs.set("page", String(params.page));
  return useQuery<ArchiveListResponse | null>({
    queryKey: ["/api/archive/featured", params],
    queryFn: () => jsonOrNull<ArchiveListResponse>(`/api/archive/featured?${qs.toString()}`),
    staleTime: STALE_LONG,
  });
}

export function useArchiveSearch(query: string, params: { limit?: number; page?: number } = {}) {
  const qs = new URLSearchParams({ q: query });
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.page) qs.set("page", String(params.page));
  return useQuery<ArchiveListResponse | null>({
    queryKey: ["/api/archive/search", { query, ...params }],
    queryFn: () =>
      query.trim().length >= 2
        ? jsonOrNull<ArchiveListResponse>(`/api/archive/search?${qs.toString()}`)
        : Promise.resolve({ items: [], numFound: 0 }),
    staleTime: STALE_SHORT,
    enabled: query.trim().length >= 2,
  });
}

export function useArchiveCollection(slug: string | undefined, params: { limit?: number; page?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.page) qs.set("page", String(params.page));
  return useQuery<ArchiveListResponse | null>({
    queryKey: [`/api/archive/collection/${slug}`, params],
    queryFn: () => slug ? jsonOrNull<ArchiveListResponse>(`/api/archive/collection/${slug}?${qs.toString()}`) : Promise.resolve(null),
    staleTime: STALE_LONG,
    enabled: !!slug,
  });
}

export function useArchiveItem(idOrIdentifier: string | undefined) {
  const id = idOrIdentifier?.replace(/^archive-/, "");
  return useQuery<ArchiveItemDetail | null>({
    queryKey: [`/api/archive/item/${id}`],
    queryFn: () => id ? jsonOrNull<ArchiveItemDetail>(`/api/archive/item/${id}`) : Promise.resolve(null),
    staleTime: STALE_LONG,
    enabled: !!id,
  });
}

export interface ArchiveCuratedRow {
  id: string;
  label: string;
  description: string;
  query: string;
  items: ArchiveItem[];
  numFound: number;
}

export interface ArchiveCuratedResponse {
  rows: ArchiveCuratedRow[];
}

export function useArchiveCurated(params: { limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.limit) qs.set("limit", String(params.limit));
  return useQuery<ArchiveCuratedResponse | null>({
    queryKey: ["/api/archive/curated", params],
    queryFn: () => jsonOrNull<ArchiveCuratedResponse>(`/api/archive/curated?${qs.toString()}`),
    staleTime: STALE_LONG,
  });
}

export function useArchiveRow(rowId: string | undefined, params: { limit?: number; page?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.page) qs.set("page", String(params.page));
  return useQuery<(ArchiveCuratedRow & ArchiveListResponse) | null>({
    queryKey: [`/api/archive/row/${rowId}`, params],
    queryFn: () =>
      rowId
        ? jsonOrNull<ArchiveCuratedRow & ArchiveListResponse>(`/api/archive/row/${rowId}?${qs.toString()}`)
        : Promise.resolve(null),
    staleTime: STALE_LONG,
    enabled: !!rowId,
  });
}

// ────────────────────────────────────────────────────────────────────────
// AI hooks (Gemini / OpenAI). Auto-disabled when no provider is configured.
// ────────────────────────────────────────────────────────────────────────

export interface AiStatus {
  configured: boolean;
  provider: "gemini" | "openai" | null;
  model: string | null;
}

export function useAiStatus() {
  return useQuery<AiStatus | null>({
    queryKey: ["/api/ai/status"],
    queryFn: () => jsonOrNull<AiStatus>("/api/ai/status"),
    staleTime: 60 * 60 * 1000,
  });
}

async function aiPost<T>(path: string, body: unknown): Promise<T | null> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 503) return null;
  if (!res.ok) throw new Error(`${res.status}`);
  return (await res.json()) as T;
}

export interface RecommendItem {
  id: string;
  reason: string;
  score?: number;
}

export interface SemanticSearchResult {
  kind?: "movie" | "tv";
  genres?: string[];
  yearFrom?: number;
  yearTo?: number;
  minRating?: number;
  language?: string;
  keywords?: string[];
  withCast?: string[];
  sort?: "popularity" | "vote_average" | "release_date" | "revenue";
  explanation?: string;
}

export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function aiRecommend(
  history: Array<{ title: string; genres?: string[]; year?: string }>,
  candidates: Array<{ id: string; title: string; genres?: string[]; overview?: string; year?: string }>,
  limit = 12,
): Promise<RecommendItem[]> {
  const out = await aiPost<{ items: RecommendItem[] }>("/api/ai/recommend", { history, candidates, limit });
  return out?.items || [];
}

export async function aiSemanticSearch(query: string): Promise<SemanticSearchResult | null> {
  return aiPost<SemanticSearchResult>("/api/ai/semantic-search", { query });
}

export async function aiChat(
  title: string,
  year: string | number | null | undefined,
  overview: string | undefined,
  messages: AiChatMessage[],
): Promise<string | null> {
  const out = await aiPost<{ text: string }>("/api/ai/chat", { title, year, overview, messages });
  return out?.text || null;
}

export async function aiExplain(
  title: string,
  year: string | number | null | undefined,
  overview: string | undefined,
  kind: "movie" | "series" = "movie",
): Promise<string | null> {
  const out = await aiPost<{ text: string }>("/api/ai/explain", { title, year, overview, kind });
  return out?.text || null;
}

export async function aiTranslateVtt(vtt: string, targetLanguage: string): Promise<string | null> {
  const out = await aiPost<{ vtt: string; targetLanguage: string }>("/api/ai/translate-vtt", { vtt, targetLanguage });
  return out?.vtt || null;
}

// ────────────────────────────────────────────────────────────────────────
// Helpers used by pages.
// ────────────────────────────────────────────────────────────────────────

// Parse a "tmdb-movie-12345" or "tmdb-series-67" id back into kind + numeric id.
export function parseCatalogId(id: string | undefined):
  | { type: "movie" | "series"; tmdbId: number }
  | null {
  if (!id) return null;
  const m = id.match(/^tmdb-(movie|series)-(\d+)$/);
  if (!m) return null;
  return { type: m[1] as "movie" | "series", tmdbId: Number(m[2]) };
}

// Format runtime in minutes as "1h 45m"
export function formatRuntime(min: number | null | undefined): string {
  if (!min || min <= 0) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function ageRating(omdb: OmdbInfo | null | undefined): string {
  return omdb?.rated || "";
}
