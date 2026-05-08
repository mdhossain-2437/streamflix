import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/server/db";
import { users } from "@shared/schema";
import { storage } from "@/lib/server/storage";

const schema = z.object({
  name: z.string().min(1).max(80).optional(),
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

export async function POST(req: Request) {
  if (!db) {
    return NextResponse.json(
      { message: "Database not configured" },
      { status: 503 },
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid fields", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const existing = await storage.getUserByEmail(parsed.data.email);
  if (existing) {
    return NextResponse.json({ message: "Email already registered" }, { status: 409 });
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const [created] = await db
    .insert(users)
    .values({
      email: parsed.data.email,
      name: parsed.data.name ?? null,
      passwordHash,
      role: "user",
    })
    .returning();
  return NextResponse.json({
    id: created.id,
    email: created.email,
    name: created.name,
  });
}
