import { NextResponse } from "next/server";
import { storage } from "@/lib/server/storage";
import { requireAuth } from "@/lib/server/auth";
import { insertWatchlistSchema } from "@shared/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  let user;
  try {
    user = await requireAuth();
  } catch (e) {
    return e as Response;
  }
  try {
    const items = await storage.getWatchlistByUserId(user.id);
    return NextResponse.json(items);
  } catch (error) {
    console.error("[/api/watchlist] GET", error);
    return NextResponse.json({ message: "Failed to fetch watchlist" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let user;
  try {
    user = await requireAuth();
  } catch (e) {
    return e as Response;
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const parsed = insertWatchlistSchema.safeParse({
    ...((body ?? {}) as Record<string, unknown>),
    userId: user.id,
  });
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid watchlist data" }, { status: 400 });
  }
  const item = await storage.addToWatchlist(parsed.data);
  return NextResponse.json(item);
}
