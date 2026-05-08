import { NextResponse } from "next/server";
import { tmdbConfigured, tmdbMode } from "@/lib/server/tmdb";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ configured: tmdbConfigured(), mode: tmdbMode() });
}
