import { NextResponse } from "next/server";
import { storage } from "@/lib/server/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const item = await storage.getFeaturedContent();
    return NextResponse.json(item ?? null);
  } catch (error) {
    console.error("[/api/content/featured]", error);
    return NextResponse.json({ message: "Failed to fetch featured" }, { status: 500 });
  }
}
