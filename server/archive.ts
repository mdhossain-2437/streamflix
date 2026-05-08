// Internet Archive (archive.org) integration — public-domain feature films
// with REAL streamable MP4 URLs. Combined with TMDB metadata where possible
// so titles match the rest of the catalog visually.
//
// Endpoints:
//   GET  /api/archive/featured?limit=24      — curated feature_films collection
//   GET  /api/archive/search?q=foo&page=1    — search archive.org library
//   GET  /api/archive/item/:id               — full item incl. playable streams
//
// Archive item IDs are returned as catalog IDs of the form `archive-<identifier>`
// so they slot into the existing routing.

import type { Express, Request, Response } from "express";

const SEARCH_BASE = "https://archive.org/advancedsearch.php";
const METADATA_BASE = "https://archive.org/metadata";
const DOWNLOAD_BASE = "https://archive.org/download";
const DETAILS_BASE = "https://archive.org/details";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { value: unknown; expires: number }>();

function getCached<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit || hit.expires < Date.now()) return null;
  return hit.value as T;
}

function setCached(key: string, value: unknown): void {
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}

interface SearchDoc {
  identifier: string;
  title?: string | string[];
  description?: string | string[];
  creator?: string | string[];
  year?: string;
  date?: string;
  avg_rating?: string | number;
  num_reviews?: string | number;
  subject?: string | string[];
  runtime?: string;
  language?: string | string[];
}

interface SearchResponse {
  response?: {
    docs?: SearchDoc[];
    numFound?: number;
  };
}

interface ArchiveItem {
  id: string; // catalog id, e.g. "archive-night_of_the_living_dead"
  identifier: string;
  type: "movie";
  title: string;
  description: string;
  year: string;
  durationMin: number | null;
  rating: number | null;
  genres: string[];
  posterUrl: string;
  backdropUrl: string | null;
  thumbnailUrl: string;
  source: "archive";
  detailsUrl: string;
}

function firstString(v: string | string[] | undefined): string {
  if (!v) return "";
  return Array.isArray(v) ? v[0] || "" : v;
}

function arrayString(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function parseRuntime(v: string | undefined): number | null {
  if (!v) return null;
  // "1:32:24" or "92:24" or "92" or "92 min"
  const clean = String(v).trim();
  const colonParts = clean.split(":").map((p) => Number(p)).filter((n) => !isNaN(n));
  if (colonParts.length === 3) {
    return Math.round(colonParts[0] * 60 + colonParts[1] + colonParts[2] / 60);
  }
  if (colonParts.length === 2) {
    return Math.round(colonParts[0] + colonParts[1] / 60);
  }
  const minMatch = clean.match(/(\d+)\s*min/i);
  if (minMatch) return parseInt(minMatch[1], 10);
  const num = parseInt(clean, 10);
  if (!isNaN(num) && num > 0 && num < 600) return num;
  return null;
}

function docToItem(doc: SearchDoc): ArchiveItem {
  const id = doc.identifier;
  const title = firstString(doc.title) || id;
  const description = firstString(doc.description).replace(/<[^>]*>/g, "").slice(0, 1200);
  const year =
    doc.year ||
    (doc.date ? String(doc.date).slice(0, 4) : "") ||
    "";
  const rating = doc.avg_rating !== undefined ? Number(doc.avg_rating) : null;
  return {
    id: `archive-${id}`,
    identifier: id,
    type: "movie",
    title,
    description,
    year,
    durationMin: parseRuntime(doc.runtime),
    rating: rating !== null && !isNaN(rating) ? rating : null,
    genres: arrayString(doc.subject).slice(0, 8),
    posterUrl: `https://archive.org/services/img/${id}`,
    backdropUrl: `https://archive.org/services/img/${id}`,
    thumbnailUrl: `https://archive.org/services/img/${id}`,
    source: "archive",
    detailsUrl: `${DETAILS_BASE}/${id}`,
  };
}

async function searchArchive(query: string, rows: number, page: number): Promise<{
  items: ArchiveItem[];
  numFound: number;
}> {
  const cacheK = `search|${query}|${rows}|${page}`;
  const hit = getCached<{ items: ArchiveItem[]; numFound: number }>(cacheK);
  if (hit) return hit;

  const url =
    `${SEARCH_BASE}?` +
    [
      `q=${encodeURIComponent(query)}`,
      `fl[]=identifier`,
      `fl[]=title`,
      `fl[]=description`,
      `fl[]=creator`,
      `fl[]=year`,
      `fl[]=date`,
      `fl[]=avg_rating`,
      `fl[]=num_reviews`,
      `fl[]=subject`,
      `fl[]=runtime`,
      `fl[]=language`,
      `sort[]=downloads desc`,
      `rows=${rows}`,
      `page=${page}`,
      `output=json`,
    ].join("&");

  const res = await fetch(url, { headers: { "User-Agent": "StreamFlix/1.0" } });
  if (!res.ok) throw new Error(`Archive search ${res.status}`);
  const data = (await res.json()) as SearchResponse;
  const docs = data.response?.docs || [];
  const items = docs.map(docToItem);
  const out = { items, numFound: data.response?.numFound || items.length };
  setCached(cacheK, out);
  return out;
}

interface MetadataFile {
  name: string;
  format?: string;
  source?: string;
  size?: string;
  length?: string;
  height?: string;
  width?: string;
}

interface MetadataResponse {
  metadata?: SearchDoc & {
    mediatype?: string;
    licenseurl?: string;
  };
  files?: MetadataFile[];
  server?: string;
  dir?: string;
}

interface PlayableSource {
  url: string;
  type: string;
  label: string;
  size: number | null;
  duration: number | null;
}

function pickPlayableFiles(files: MetadataFile[], identifier: string): PlayableSource[] {
  // Preferred order: h.264 derivative MP4 → 512Kb MPEG4 → original MP4 → WebM.
  const isVideo = (f: MetadataFile) =>
    /\.mp4$|\.webm$|\.m4v$|\.ogv$|\.mov$/i.test(f.name);
  const videoFiles = files.filter(isVideo);
  const sources: PlayableSource[] = [];
  for (const f of videoFiles) {
    const fmt = (f.format || "").toLowerCase();
    let label = "Original";
    if (fmt.includes("h.264 ia")) label = "Auto (h.264)";
    else if (fmt.includes("h.264")) label = "Standard (h.264)";
    else if (fmt.includes("512kb")) label = "Mobile (512Kb)";
    else if (fmt.includes("mpeg4")) label = "MPEG4";
    else if (fmt.includes("webm")) label = "WebM";
    else if (f.height) label = `${f.height}p`;
    sources.push({
      url: `${DOWNLOAD_BASE}/${identifier}/${encodeURIComponent(f.name)}`,
      type: f.name.endsWith(".webm") ? "video/webm" : "video/mp4",
      label,
      size: f.size ? parseInt(f.size, 10) : null,
      duration: f.length ? parseRuntime(f.length) : null,
    });
  }
  // Stable ordering — preferred first
  const score = (s: PlayableSource): number => {
    const l = s.label.toLowerCase();
    if (l.includes("auto")) return 0;
    if (l.includes("standard")) return 1;
    if (l.includes("mpeg4")) return 2;
    if (l.includes("webm")) return 3;
    if (l.includes("mobile")) return 4;
    return 5;
  };
  sources.sort((a, b) => score(a) - score(b));
  return sources;
}

function pickSubtitleFiles(files: MetadataFile[], identifier: string): Array<{
  url: string;
  label: string;
  srclang: string;
}> {
  return files
    .filter((f) => /\.vtt$|\.srt$/i.test(f.name))
    .map((f) => ({
      url: `${DOWNLOAD_BASE}/${identifier}/${encodeURIComponent(f.name)}`,
      label: f.name.replace(/\.(vtt|srt)$/i, ""),
      srclang: "en",
    }));
}

async function fetchItemDetail(identifier: string): Promise<{
  item: ArchiveItem;
  sources: PlayableSource[];
  subtitles: Array<{ url: string; label: string; srclang: string }>;
  embedUrl: string;
  licenseUrl: string | null;
} | null> {
  const cacheK = `item|${identifier}`;
  const hit = getCached<{
    item: ArchiveItem;
    sources: PlayableSource[];
    subtitles: Array<{ url: string; label: string; srclang: string }>;
    embedUrl: string;
    licenseUrl: string | null;
  }>(cacheK);
  if (hit) return hit;

  const res = await fetch(`${METADATA_BASE}/${identifier}`, {
    headers: { "User-Agent": "StreamFlix/1.0" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as MetadataResponse;
  if (!data.metadata) return null;
  const meta = data.metadata;
  const item = docToItem({
    identifier,
    title: meta.title,
    description: meta.description,
    creator: meta.creator,
    year: meta.year,
    date: meta.date,
    subject: meta.subject,
    runtime: meta.runtime,
    avg_rating: meta.avg_rating,
    language: meta.language,
  });
  const sources = pickPlayableFiles(data.files || [], identifier);
  const subtitles = pickSubtitleFiles(data.files || [], identifier);
  const out = {
    item,
    sources,
    subtitles,
    embedUrl: `https://archive.org/embed/${identifier}`,
    licenseUrl: meta.licenseurl || null,
  };
  setCached(cacheK, out);
  return out;
}

const FEATURED_QUERY =
  "collection:(feature_films) AND mediatype:(movies) AND format:(h.264) AND -collection:(test_videos)";

export function registerArchiveRoutes(app: Express): void {
  app.get("/api/archive/status", (_req: Request, res: Response) => {
    res.json({ configured: true, source: "archive.org" });
  });

  app.get("/api/archive/featured", async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(String(req.query.limit ?? "24"), 10) || 24, 60);
      const page = Math.max(parseInt(String(req.query.page ?? "1"), 10) || 1, 1);
      const out = await searchArchive(FEATURED_QUERY, limit, page);
      res.json(out);
    } catch (e) {
      console.error("[archive] featured", e);
      res.status(502).json({ message: "archive.org unavailable" });
    }
  });

  app.get("/api/archive/search", async (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string) || "";
      const limit = Math.min(parseInt(String(req.query.limit ?? "30"), 10) || 30, 60);
      const page = Math.max(parseInt(String(req.query.page ?? "1"), 10) || 1, 1);
      if (!q.trim()) return res.json({ items: [], numFound: 0 });
      const query = `(${q}) AND mediatype:(movies)`;
      const out = await searchArchive(query, limit, page);
      res.json(out);
    } catch (e) {
      console.error("[archive] search", e);
      res.status(502).json({ message: "archive.org unavailable" });
    }
  });

  app.get("/api/archive/collection/:slug", async (req: Request, res: Response) => {
    try {
      const slug = req.params.slug.replace(/[^a-z0-9_-]/gi, "");
      const limit = Math.min(parseInt(String(req.query.limit ?? "30"), 10) || 30, 60);
      const page = Math.max(parseInt(String(req.query.page ?? "1"), 10) || 1, 1);
      const query = `collection:(${slug}) AND mediatype:(movies)`;
      const out = await searchArchive(query, limit, page);
      res.json(out);
    } catch (e) {
      console.error("[archive] collection", e);
      res.status(502).json({ message: "archive.org unavailable" });
    }
  });

  app.get("/api/archive/item/:id", async (req: Request, res: Response) => {
    try {
      const identifier = req.params.id.replace(/^archive-/, "");
      const detail = await fetchItemDetail(identifier);
      if (!detail) return res.status(404).json({ message: "Not found" });
      res.json(detail);
    } catch (e) {
      console.error("[archive] item", e);
      res.status(502).json({ message: "archive.org unavailable" });
    }
  });

  // Streaming proxy used by the client downloader. Many archive.org CDN
  // mirrors strip the access-control-allow-origin header on redirects, which
  // breaks browser fetch(). The browser hits this proxy instead, the server
  // follows redirects with full network access, and we re-stream the bytes
  // back with permissive CORS headers and an Range support.
  app.get("/api/proxy/download", async (req: Request, res: Response) => {
    const target = String(req.query.url || "");
    if (!/^https?:\/\//i.test(target)) {
      return res.status(400).json({ message: "Invalid url" });
    }
    let host: string;
    try {
      host = new URL(target).hostname.toLowerCase();
    } catch {
      return res.status(400).json({ message: "Invalid url" });
    }
    // Allow-list: only proxy from public-domain / open archives. We don't
    // want this to become an open relay.
    const allowed =
      /(^|\.)archive\.org$/.test(host) ||
      /(^|\.)us\.archive\.org$/.test(host) ||
      /(^|\.)ca\.archive\.org$/.test(host) ||
      /\.archive\.org$/.test(host);
    if (!allowed) {
      return res.status(403).json({ message: "Host not allowed" });
    }
    try {
      const upstream = await fetch(target, {
        redirect: "follow",
        headers: req.headers.range ? { range: String(req.headers.range) } : {},
      });
      res.status(upstream.status);
      res.setHeader("access-control-allow-origin", "*");
      const passthrough = [
        "content-type",
        "content-length",
        "accept-ranges",
        "content-range",
        "last-modified",
        "etag",
      ];
      for (const h of passthrough) {
        const v = upstream.headers.get(h);
        if (v) res.setHeader(h, v);
      }
      if (!upstream.body) {
        res.end();
        return;
      }
      const reader = upstream.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!res.write(Buffer.from(value))) {
              await new Promise<void>((resolve) => res.once("drain", resolve));
            }
          }
          res.end();
        } catch (err) {
          console.error("[archive] proxy pump", err);
          if (!res.headersSent) res.status(502);
          res.end();
        }
      };
      pump();
    } catch (e) {
      console.error("[archive] proxy", e);
      res.status(502).json({ message: "Proxy failed" });
    }
  });
}
