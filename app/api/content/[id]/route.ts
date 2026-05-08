import { NextResponse } from "next/server";
import { storage } from "@/lib/server/storage";
import { requireAdmin } from "@/lib/server/auth";
import { insertContentSchema } from "@shared/schema";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const item = await storage.getContent(params.id);
  if (!item) {
    return NextResponse.json({ message: "Content not found" }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
  } catch (e) {
    return e as Response;
  }
  const existing = await storage.getContent(params.id);
  if (!existing) {
    return NextResponse.json({ message: "Content not found" }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const parsed = insertContentSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid content data", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const updated = await storage.updateContent(params.id, parsed.data);
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
  } catch (e) {
    return e as Response;
  }
  await storage.deleteContent(params.id);
  return NextResponse.json({ success: true });
}
