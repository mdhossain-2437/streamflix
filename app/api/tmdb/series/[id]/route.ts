import { NextResponse } from "next/server";
import { tmdbConfigured, tmdbFetch, normalizeMovie, type TmdbMovieRaw } from "@/lib/server/tmdb";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!tmdbConfigured()) {
    return NextResponse.json({ message: "TMDB_API_KEY not configured" }, { status: 503 });
  }
  try {
    const data = await tmdbFetch<TmdbMovieRaw & { credits?: unknown; videos?: unknown }>(
      `/tv/${params.id}`,
      { append_to_response: "credits,videos,similar,recommendations" },
    );
    return NextResponse.json({ ...normalizeMovie(data, "series"), raw: data });
  } catch (e) {
    console.error("[tmdb] series failed", e);
    return NextResponse.json({ message: "TMDB upstream failed" }, { status: 502 });
  }
}
