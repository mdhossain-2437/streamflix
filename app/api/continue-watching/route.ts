import { NextResponse } from "next/server";
import { storage } from "@/lib/server/storage";
import { requireAuth } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  let user;
  try {
    user = await requireAuth();
  } catch (e) {
    return e as Response;
  }
  const items = await storage.getViewingProgressByUserId(user.id);
  return NextResponse.json(items);
}
