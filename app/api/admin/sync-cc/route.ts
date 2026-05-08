import { NextResponse } from "next/server";
import { CC_CATALOG } from "@/lib/server/cc-catalog";
import { storage } from "@/lib/server/storage";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireAdmin();
  } catch (e) {
    return e as Response;
  }
  const created = [] as { id: string; title: string }[];
  for (const film of CC_CATALOG) {
    try {
      const row = await storage.createContent({
        type: "movie",
        title: film.title,
        description: film.description,
        thumbnailUrl: film.backdropUrl,
        backdropUrl: film.backdropUrl,
        trailerUrl: film.trailerUrl ?? null,
        videoUrl: film.videoUrl,
        duration: film.durationMinutes,
        releaseYear: film.releaseYear,
        rating: film.rating,
        imdbRating: film.imdbRating ?? null,
        genres: film.genres,
        cast: null,
        featured: false,
        trending: false,
        source: "creative_commons",
        sourceId: film.externalId,
        license: film.license,
      });
      created.push({ id: row.id, title: row.title });
    } catch (e) {
      console.error("[sync-cc] failed to insert", film.externalId, e);
    }
  }
  return NextResponse.json({ inserted: created.length, items: created });
}
