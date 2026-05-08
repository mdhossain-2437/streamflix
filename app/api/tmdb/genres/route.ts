import { NextResponse } from "next/server";
import { tmdbConfigured, tmdbFetch } from "@/lib/server/tmdb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!tmdbConfigured()) {
    return NextResponse.json({ message: "TMDB_API_KEY not configured" }, { status: 503 });
  }
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") === "tv" ? "tv" : "movie";
  try {
    const data = await tmdbFetch<{ genres: { id: number; name: string }[] }>(
      `/genre/${kind}/list`,
    );
    return NextResponse.json(data.genres);
  } catch (e) {
    console.error("[tmdb] genres failed", e);
    return NextResponse.json({ message: "TMDB upstream failed" }, { status: 502 });
  }
}
