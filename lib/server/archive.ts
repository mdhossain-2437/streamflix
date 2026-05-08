// Internet Archive (archive.org) integration.
// All content surfaced here is in the public domain or under permissive licenses.
// Docs: https://archive.org/services/docs/api/

const ADVANCED_SEARCH = "https://archive.org/advancedsearch.php";
const METADATA = "https://archive.org/metadata";

export interface ArchiveDoc {
  identifier: string;
  title?: string;
  description?: string;
  creator?: string;
  date?: string;
  year?: string;
  subject?: string[];
  licenseurl?: string;
  mediatype?: string;
  downloads?: number;
  // image (poster) — archive.org always serves /services/img/<identifier>
}

export interface ArchiveItem {
  id: string;
  identifier: string;
  type: "movie" | "series";
  title: string;
  description: string;
  creator: string | null;
  year: string;
  posterUrl: string;
  thumbnailUrl: string;
  videoUrl: string;
  license: string | null;
  genres: string[];
  source: "internet_archive";
}

export interface ArchiveSearchResponse {
  response: {
    numFound: number;
    start: number;
    docs: ArchiveDoc[];
  };
}

/**
 * Default query: feature films + movies, public-domain or CC, with media available.
 * Each query is cached for 30 minutes.
 */
const SEARCH_CACHE = new Map<string, { ts: number; data: ArchiveSearchResponse }>();
const CACHE_MS = 30 * 60 * 1000;

export async function archiveSearch(opts: {
  q?: string;
  collection?: string; // e.g. "feature_films", "moviesandfilms"
  rows?: number;
  page?: number;
  sort?: "downloads desc" | "date desc" | "publicdate desc";
}): Promise<ArchiveSearchResponse> {
  const q =
    opts.q ??
    `mediatype:(movies) AND collection:(${opts.collection ?? "feature_films"})`;
  const params = new URLSearchParams({
    q,
    output: "json",
    rows: String(opts.rows ?? 24),
    page: String(opts.page ?? 1),
    sort: opts.sort ?? "downloads desc",
  });
  // request specific fields to keep payload small
  for (const f of [
    "identifier",
    "title",
    "description",
    "creator",
    "date",
    "year",
    "subject",
    "licenseurl",
    "mediatype",
    "downloads",
  ]) {
    params.append("fl[]", f);
  }
  const url = `${ADVANCED_SEARCH}?${params.toString()}`;
  const cached = SEARCH_CACHE.get(url);
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    return cached.data;
  }
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 1800 },
  });
  if (!res.ok) {
    throw new Error(`Internet Archive search ${res.status}`);
  }
  const data = (await res.json()) as ArchiveSearchResponse;
  SEARCH_CACHE.set(url, { ts: Date.now(), data });
  return data;
}

interface ArchiveMetadataFile {
  name: string;
  format?: string;
  source?: string;
  size?: string;
  length?: string;
}

interface ArchiveMetadataResponse {
  metadata?: {
    identifier?: string;
    title?: string;
    description?: string;
    creator?: string | string[];
    date?: string;
    year?: string;
    subject?: string | string[];
    licenseurl?: string;
  };
  files?: ArchiveMetadataFile[];
  d1?: string;
  dir?: string;
}

const VIDEO_FORMAT_PRIORITY = [
  "h.264",
  "h.264 ia",
  "mpeg4",
  "512kb mpeg4",
  "matroska",
  "ogg video",
];

function pickVideoFile(files: ArchiveMetadataFile[]): string | null {
  // Prefer the highest quality web-friendly format
  for (const fmt of VIDEO_FORMAT_PRIORITY) {
    const match = files.find(
      (f) => f.format?.toLowerCase() === fmt && f.name.match(/\.(mp4|webm|m4v|mkv|ogv)$/i),
    );
    if (match) return match.name;
  }
  return files.find((f) => f.name.match(/\.mp4$/i))?.name ?? null;
}

export async function archiveItemDetail(identifier: string): Promise<ArchiveItem | null> {
  const res = await fetch(`${METADATA}/${encodeURIComponent(identifier)}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as ArchiveMetadataResponse;
  if (!data.metadata) return null;
  const meta = data.metadata;
  const files = data.files ?? [];
  const fileName = pickVideoFile(files);
  if (!fileName) return null;
  const dir = data.dir ?? `/${identifier}`;
  // archive.org serves files at https://archive.org<dir>/<filename>
  const videoUrl = `https://archive.org${dir}/${encodeURIComponent(fileName.replace(/^\//, ""))}`;
  const subjects = Array.isArray(meta.subject)
    ? meta.subject
    : meta.subject
      ? [meta.subject]
      : [];
  const creator = Array.isArray(meta.creator)
    ? meta.creator.join(", ")
    : meta.creator ?? null;
  return {
    id: `archive-${identifier}`,
    identifier,
    type: "movie",
    title: meta.title ?? identifier,
    description: meta.description ?? "",
    creator,
    year: meta.year ?? meta.date?.slice(0, 4) ?? "",
    posterUrl: `https://archive.org/services/img/${identifier}`,
    thumbnailUrl: `https://archive.org/services/img/${identifier}`,
    videoUrl,
    license: meta.licenseurl ?? null,
    genres: subjects.slice(0, 6),
    source: "internet_archive",
  };
}

export function archiveDocToCard(doc: ArchiveDoc): {
  id: string;
  identifier: string;
  title: string;
  description: string;
  posterUrl: string;
  year: string;
  genres: string[];
  license: string | null;
  creator: string | null;
} {
  return {
    id: `archive-${doc.identifier}`,
    identifier: doc.identifier,
    title: doc.title ?? doc.identifier,
    description: doc.description ?? "",
    posterUrl: `https://archive.org/services/img/${doc.identifier}`,
    year: doc.year ?? doc.date?.slice(0, 4) ?? "",
    genres: doc.subject?.slice(0, 6) ?? [],
    license: doc.licenseurl ?? null,
    creator: doc.creator ?? null,
  };
}
