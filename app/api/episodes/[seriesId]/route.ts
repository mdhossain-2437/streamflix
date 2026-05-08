import { NextResponse } from "next/server";
import { storage } from "@/lib/server/storage";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { seriesId: string } }) {
  try {
    const items = await storage.getEpisodesBySeriesId(params.seriesId);
    return NextResponse.json(items);
  } catch (error) {
    console.error("[/api/episodes]", error);
    return NextResponse.json({ message: "Failed to fetch episodes" }, { status: 500 });
  }
}
