import { NextResponse } from "next/server";
import { tmdbConfigured, tmdbFetch, normalizeMovie, type TmdbMovieRaw } from "@/lib/server/tmdb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!tmdbConfigured()) {
    return NextResponse.json({ message: "TMDB_API_KEY not configured" }, { status: 503 });
  }
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  if (!q) return NextResponse.json([]);
  try {
    const data = await tmdbFetch<{ results: TmdbMovieRaw[] }>(`/search/multi`, { query: q });
    return NextResponse.json(
      data.results
        .filter((m) => m.poster_path || m.backdrop_path)
        .map((m) => normalizeMovie(m, m.first_air_date ? "series" : "movie")),
    );
  } catch (e) {
    console.error("[tmdb] search failed", e);
    return NextResponse.json({ message: "TMDB upstream failed" }, { status: 502 });
  }
}
