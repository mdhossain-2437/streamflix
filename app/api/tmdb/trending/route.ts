import { NextResponse } from "next/server";
import { tmdbConfigured, tmdbFetch, normalizeMovie, type TmdbMovieRaw } from "@/lib/server/tmdb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!tmdbConfigured()) {
    return NextResponse.json({ message: "TMDB_API_KEY not configured" }, { status: 503 });
  }
  const url = new URL(req.url);
  const window = url.searchParams.get("window") === "day" ? "day" : "week";
  const kind = url.searchParams.get("kind") === "tv" ? "tv" : "all";
  try {
    const data = await tmdbFetch<{ results: TmdbMovieRaw[] }>(`/trending/${kind}/${window}`);
    return NextResponse.json(
      data.results.map((m) => normalizeMovie(m, m.first_air_date ? "series" : "movie")),
    );
  } catch (e) {
    console.error("[tmdb] trending failed", e);
    return NextResponse.json({ message: "TMDB upstream failed" }, { status: 502 });
  }
}
