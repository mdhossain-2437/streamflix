// Adapt CatalogItem / ContentDetail (TMDB-shaped, returned by /api/tmdb/*) →
// Content (Drizzle schema). ContentCard, ContentRow, etc. only consume
// id/type/title/description/thumbnailUrl/posterUrl, so the cast is safe.
import type { Content } from "@shared/schema";
import type { ArchiveItem, CatalogItem, ContentDetail } from "./api";

// Legacy shim — kept so old callers compile.
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

export function tmdbToContent(
  item: CatalogItem | ContentDetail | TmdbItem,
): Content {
  const cat = item as CatalogItem;
  // CatalogItem.seasons is a number (count); ContentDetail uses seasonCount
  // and renames the array to seasonsList. Use whichever is present.
  const seasonCount =
    "seasonCount" in item && typeof item.seasonCount === "number"
      ? item.seasonCount
      : "seasons" in item && typeof item.seasons === "number"
        ? item.seasons
        : null;
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    description: item.description ?? "",
    posterUrl: item.posterUrl ?? null,
    backdropUrl: item.backdropUrl ?? null,
    thumbnailUrl: item.thumbnailUrl ?? item.posterUrl ?? null,
    videoUrl: null,
    trailerUrl: null,
    releaseYear: item.year ? Number(item.year) : null,
    rating: null,
    imdbRating:
      cat.voteAverage !== undefined && cat.voteAverage !== null
        ? cat.voteAverage.toFixed(1)
        : item.rating?.toString() ?? null,
    duration: item.durationMin ?? null,
    seasons: seasonCount,
    genres: item.genres ?? [],
    cast: null,
    director: null,
    isFeatured: false,
    isTrending: false,
    isTop10: false,
    rank: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Content;
}

export function archiveToContent(item: ArchiveItem): Content {
  return {
    id: item.id,
    type: "movie",
    title: item.title,
    description: item.description,
    posterUrl: item.posterUrl,
    backdropUrl: item.backdropUrl,
    thumbnailUrl: item.thumbnailUrl,
    videoUrl: null,
    trailerUrl: null,
    releaseYear: item.year ? Number(item.year) : null,
    rating: "Free",
    imdbRating: item.rating !== null ? item.rating.toFixed(1) : null,
    duration: item.durationMin,
    seasons: null,
    genres: item.genres ?? [],
    cast: null,
    director: null,
    isFeatured: false,
    isTrending: false,
    isTop10: false,
    rank: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Content;
}
