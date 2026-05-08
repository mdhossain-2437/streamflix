import { NextResponse } from "next/server";
import { storage } from "@/lib/server/storage";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit")) || 6;
  try {
    const items = await storage.getSimilarContent(params.id, limit);
    return NextResponse.json(items);
  } catch (error) {
    console.error("[/api/content/similar]", error);
    return NextResponse.json({ message: "Failed to fetch similar" }, { status: 500 });
  }
}
