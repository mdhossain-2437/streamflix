import { NextResponse } from "next/server";
import { storage } from "@/lib/server/storage";
import { requireAuth } from "@/lib/server/auth";
import { insertViewingProgressSchema } from "@shared/schema";

export const dynamic = "force-dynamic";

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
  const parsed = insertViewingProgressSchema.safeParse({
    ...((body ?? {}) as Record<string, unknown>),
    userId: user.id,
  });
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid progress data" }, { status: 400 });
  }
  const updated = await storage.updateViewingProgress(parsed.data);
  return NextResponse.json(updated);
}
