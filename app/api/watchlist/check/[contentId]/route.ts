import { NextResponse } from "next/server";
import { storage } from "@/lib/server/storage";
import { requireAuth } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { contentId: string } }) {
  let user;
  try {
    user = await requireAuth();
  } catch (e) {
    return e as Response;
  }
  const inList = await storage.isInWatchlist(user.id, params.contentId);
  return NextResponse.json(inList);
}
