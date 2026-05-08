import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@/lib/server/storage";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const uploadSchema = z.object({
  type: z.enum(["movie", "series"]),
  title: z.string().min(1),
  description: z.string().min(1),
  thumbnailUrl: z.string().url().optional().nullable(),
  backdropUrl: z.string().url().optional().nullable(),
  trailerUrl: z.string().url().optional().nullable(),
  videoUrl: z.string().url(),
  duration: z.number().int().positive().optional().nullable(),
  releaseYear: z.number().int().min(1880).max(2100).optional().nullable(),
  rating: z.string().optional().nullable(),
  imdbRating: z.string().optional().nullable(),
  genres: z.array(z.string()).optional(),
  cast: z
    .array(z.object({ name: z.string(), role: z.string().optional() }))
    .optional()
    .nullable(),
  featured: z.boolean().optional(),
  trending: z.boolean().optional(),
  license: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    return e as Response;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const row = await storage.createContent({
      ...parsed.data,
      genres: parsed.data.genres ?? [],
      cast: (parsed.data.cast ?? null) as never,
      source: "manual",
      sourceId: null,
      license: parsed.data.license ?? null,
    });
    return NextResponse.json({ id: row.id, title: row.title }, { status: 201 });
  } catch (err) {
    console.error("[admin/upload]", err);
    return NextResponse.json(
      { error: "Failed to create content" },
      { status: 500 },
    );
  }
}
