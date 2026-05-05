// Adapt TmdbItem → a Content-shaped object so the existing UI components
// (ContentCard, ContentRow, ContentDetail) can render real TMDB data without
// changes. The local Postgres seed remains the source of truth when TMDB is
// not configured.
import type { Content } from "@shared/schema";
import type { TmdbItem } from "./tmdb";

export function tmdbToContent(item: TmdbItem): Content {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    description: item.description,
    posterUrl: item.posterUrl,
    backdropUrl: item.backdropUrl,
    thumbnailUrl: item.thumbnailUrl ?? item.posterUrl,
    videoUrl: null,
    trailerUrl: null,
    releaseYear: item.year ? Number(item.year) : null,
    rating: item.rating ? `PG-13` : null,
    imdbRating: item.rating ? String(item.rating) : null,
    duration: item.durationMin,
    seasons: item.seasons,
    genres: item.genres,
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
