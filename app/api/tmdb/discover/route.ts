import { NextResponse } from "next/server";
import { tmdbConfigured, tmdbFetch, normalizeMovie, type TmdbMovieRaw } from "@/lib/server/tmdb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!tmdbConfigured()) {
    return NextResponse.json({ message: "TMDB_API_KEY not configured" }, { status: 503 });
  }
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") === "tv" ? "tv" : "movie";
  try {
    const data = await tmdbFetch<{ results: TmdbMovieRaw[] }>(`/discover/${kind}`, {
      with_genres: url.searchParams.get("genre") ?? undefined,
      sort_by: url.searchParams.get("sort") ?? "popularity.desc",
      page: url.searchParams.get("page") ?? "1",
    });
    return NextResponse.json(
      data.results.map((m) => normalizeMovie(m, kind === "tv" ? "series" : "movie")),
    );
  } catch (e) {
    console.error("[tmdb] discover failed", e);
    return NextResponse.json({ message: "TMDB upstream failed" }, { status: 502 });
  }
}
