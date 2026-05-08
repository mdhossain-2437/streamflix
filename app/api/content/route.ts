import { NextResponse } from "next/server";
import { storage } from "@/lib/server/storage";
import { auth, requireAdmin } from "@/lib/server/auth";
import { insertContentSchema } from "@shared/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? undefined;
  const sort = url.searchParams.get("sort") ?? undefined;
  const limit = Number(url.searchParams.get("limit")) || 50;
  const genres = url.searchParams.getAll("genres");

  try {
    const items = await storage.getAllContent({
      type,
      genres: genres.length > 0 ? genres : undefined,
      sort,
      limit,
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("[/api/content] GET", error);
    return NextResponse.json({ message: "Failed to fetch content" }, { status: 500 });
  }
}

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
  const parsed = insertContentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid content data", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    const created = await storage.createContent(parsed.data);
    return NextResponse.json(created);
  } catch (error) {
    console.error("[/api/content] POST", error);
    return NextResponse.json({ message: "Failed to create content" }, { status: 500 });
  }
}
