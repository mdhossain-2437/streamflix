import { NextResponse } from "next/server";
import { storage } from "@/lib/server/storage";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit")) || 20;
  try {
    const items = await storage.getTrendingContent(limit);
    return NextResponse.json(items);
  } catch (error) {
    console.error("[/api/content/trending]", error);
    return NextResponse.json({ message: "Failed to fetch trending" }, { status: 500 });
  }
}
