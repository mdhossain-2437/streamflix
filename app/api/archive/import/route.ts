import { NextResponse } from "next/server";
import { z } from "zod";
import { archiveItemDetail } from "@/lib/server/archive";
import { storage } from "@/lib/server/storage";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  identifiers: z.array(z.string().min(1)).min(1).max(50),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    return e as Response;
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid identifiers list" }, { status: 400 });
  }

  const imported: { identifier: string; id?: string; error?: string }[] = [];
  for (const identifier of parsed.data.identifiers) {
    try {
      const item = await archiveItemDetail(identifier);
      if (!item) {
        imported.push({ identifier, error: "no_video_file" });
        continue;
      }
      const created = await storage.createContent({
        type: "movie",
        title: item.title,
        description: item.description,
        thumbnailUrl: item.thumbnailUrl,
        backdropUrl: item.posterUrl,
        videoUrl: item.videoUrl,
        releaseYear: item.year ? Number(item.year) : null,
        genres: item.genres,
        source: "internet_archive",
        sourceId: item.identifier,
        license: item.license,
        trailerUrl: null,
        rating: null,
        imdbRating: null,
        cast: null,
        duration: null,
        featured: false,
        trending: false,
      });
      imported.push({ identifier, id: created.id });
    } catch (e) {
      imported.push({
        identifier,
        error: e instanceof Error ? e.message : "unknown_error",
      });
    }
  }
  return NextResponse.json({ imported });
}
