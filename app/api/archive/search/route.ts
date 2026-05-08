import { NextResponse } from "next/server";
import { archiveSearch, archiveDocToCard } from "@/lib/server/archive";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const collection = url.searchParams.get("collection") ?? undefined;
  const rows = Number(url.searchParams.get("rows")) || 24;
  const page = Number(url.searchParams.get("page")) || 1;
  try {
    const data = await archiveSearch({ q: q || undefined, collection, rows, page });
    return NextResponse.json({
      total: data.response.numFound,
      page,
      rows,
      items: data.response.docs.map(archiveDocToCard),
    });
  } catch (e) {
    console.error("[archive] search failed", e);
    return NextResponse.json({ message: "Internet Archive upstream failed" }, { status: 502 });
  }
}
