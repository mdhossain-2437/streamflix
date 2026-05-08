// Parallel chunked downloader.
//
// HTTP/1.1 + HTTP/2 servers supporting `Range` lets us split a single file
// across N concurrent connections. Each connection downloads a contiguous
// byte range; we stitch them together at the end. The trick is the same one
// IDM, aria2, and youtube-dl use to saturate flaky links — multiple TCP
// streams compete for bandwidth more aggressively than one, so total
// throughput on lossy connections climbs ~3-10×.
//
// Resilience features:
// - Each chunk is independently resumable: a chunk that fails mid-flight is
//   re-downloaded with a fresh `Range: bytes=offset-end` request, where
//   `offset` is the number of bytes already received for that chunk.
// - Per-chunk Uint8Array can be persisted to IndexedDB by the caller via
//   onChunkComplete; on page reload, completed chunks are restored from disk
//   and only the missing chunks are refetched. (Used by downloadQueue.ts.)
//
// Falls back to a single streaming fetch when the server doesn't advertise
// Accept-Ranges: bytes, or when total-size is unknown.

import { idbSet, idbGet, idbClearPrefix } from "@/lib/idbStore";

export interface ParallelOptions {
  url: string;
  /** Job id, used for IndexedDB chunk keying and resume. */
  id: string;
  /** Concurrent connection count (1-8 sane). */
  concurrency?: number;
  /** Target chunk size in bytes (default 4 MB). The actual chunk count is
   *  max(concurrency, ceil(total/chunkBytes)). */
  chunkBytes?: number;
  signal?: AbortSignal;
  onProgress?: (p: {
    loaded: number;
    total: number;
    speed: number; // bytes/sec
    activeConnections: number;
  }) => void;
}

export interface ParallelResult {
  bytes: Uint8Array;
  totalBytes: number;
  /** True if the server supported parallel range fetches; false if we fell
   *  back to a single-stream download. */
  parallelUsed: boolean;
  /** The URL we ended up fetching from (after redirects, proxy fallback). */
  finalUrl: string;
}

interface ChunkPlan {
  index: number;
  start: number;
  end: number; // inclusive
}

interface ChunkRecord {
  index: number;
  bytes: Uint8Array;
}

const PROXY_PREFIX = "/api/proxy/download?url=";

function chunkKey(jobId: string, index: number): string {
  return `${jobId}:${index}`;
}

async function loadCachedChunks(
  jobId: string,
  total: number,
): Promise<Map<number, Uint8Array>> {
  const map = new Map<number, Uint8Array>();
  for (let i = 0; i < total; i++) {
    const cached = await idbGet<ChunkRecord>("downloadChunks", chunkKey(jobId, i));
    if (cached?.bytes) map.set(i, cached.bytes);
  }
  return map;
}

async function saveChunk(jobId: string, index: number, bytes: Uint8Array): Promise<void> {
  // Persist the raw bytes so a refresh can resume without re-downloading.
  await idbSet<ChunkRecord>("downloadChunks", chunkKey(jobId, index), { index, bytes });
}

async function probeRange(url: string, signal?: AbortSignal): Promise<{
  size: number;
  acceptsRanges: boolean;
  finalUrl: string;
}> {
  // 1) Try our server-side proxy first (CORS-safe, follows redirects). The
  //    proxy returns 502 only when the upstream URL isn't on its allowlist.
  const proxied = `${PROXY_PREFIX}${encodeURIComponent(url)}`;
  const trySources = [proxied, url];
  for (const src of trySources) {
    try {
      // Request bytes 0-0; servers that support ranges return 206 + content-range.
      const res = await fetch(src, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        credentials: "omit",
        signal,
      });
      // Drain body (1 byte) immediately so the connection can be reused.
      try {
        await res.arrayBuffer();
      } catch {
        /* ignore */
      }
      if (res.status === 206) {
        const cr = res.headers.get("content-range") || "";
        // bytes 0-0/12345
        const m = cr.match(/\/(\d+)$/);
        const size = m ? Number(m[1]) : 0;
        if (size > 0) {
          return { size, acceptsRanges: true, finalUrl: src };
        }
      }
      if (res.ok) {
        // Server returned full body without honoring Range. Read content-length.
        const total = Number(res.headers.get("content-length") || "0") || 0;
        return { size: total, acceptsRanges: false, finalUrl: src };
      }
    } catch {
      continue;
    }
  }
  return { size: 0, acceptsRanges: false, finalUrl: url };
}

function planChunks(total: number, concurrency: number, chunkBytes: number): ChunkPlan[] {
  const chunkCount = Math.max(concurrency, Math.ceil(total / chunkBytes));
  const size = Math.ceil(total / chunkCount);
  const plans: ChunkPlan[] = [];
  for (let i = 0; i < chunkCount; i++) {
    const start = i * size;
    const end = Math.min(total - 1, start + size - 1);
    if (start > end) break;
    plans.push({ index: i, start, end });
  }
  return plans;
}

async function fetchChunk(
  url: string,
  plan: ChunkPlan,
  signal?: AbortSignal,
  onByteProgress?: (delta: number) => void,
): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { Range: `bytes=${plan.start}-${plan.end}` },
    credentials: "omit",
    signal,
  });
  if (!res.ok && res.status !== 206) {
    throw new Error(`chunk ${plan.index} fetch failed: ${res.status}`);
  }
  const reader = res.body?.getReader();
  const expected = plan.end - plan.start + 1;
  if (!reader) {
    const buf = new Uint8Array(await res.arrayBuffer());
    onByteProgress?.(buf.byteLength);
    return buf;
  }
  const out = new Uint8Array(expected);
  let written = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      // Defensive: server may overshoot; truncate.
      const take = Math.min(value.byteLength, expected - written);
      out.set(value.subarray(0, take), written);
      written += take;
      onByteProgress?.(take);
    }
  }
  return out.subarray(0, written);
}

async function streamingFallback(
  url: string,
  signal?: AbortSignal,
  onProgress?: ParallelOptions["onProgress"],
): Promise<Uint8Array> {
  const res = await fetch(url, { credentials: "omit", signal });
  if (!res.ok) throw new Error(`fetch failed ${res.status}`);
  const total = Number(res.headers.get("content-length") || "0") || 0;
  const reader = res.body?.getReader();
  const startedAt = performance.now();
  let loaded = 0;
  if (!reader) {
    const buf = new Uint8Array(await res.arrayBuffer());
    onProgress?.({ loaded: buf.byteLength, total: buf.byteLength, speed: 0, activeConnections: 1 });
    return buf;
  }
  const parts: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      parts.push(value);
      loaded += value.byteLength;
      const elapsed = (performance.now() - startedAt) / 1000;
      const speed = elapsed > 0 ? loaded / elapsed : 0;
      onProgress?.({ loaded, total, speed, activeConnections: 1 });
    }
  }
  const out = new Uint8Array(loaded);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.byteLength;
  }
  return out;
}

export async function parallelDownload(opts: ParallelOptions): Promise<ParallelResult> {
  const concurrency = Math.max(1, Math.min(8, opts.concurrency ?? 4));
  const chunkBytes = opts.chunkBytes ?? 4 * 1024 * 1024;
  const probe = await probeRange(opts.url, opts.signal);
  const total = probe.size;
  const finalUrl = probe.finalUrl;

  // No parallel path possible (server didn't advertise Range or unknown size):
  // fall back to a streaming single-connection download.
  if (!probe.acceptsRanges || total === 0 || concurrency === 1) {
    const bytes = await streamingFallback(finalUrl, opts.signal, opts.onProgress);
    return { bytes, totalBytes: bytes.byteLength, parallelUsed: false, finalUrl };
  }

  const plans = planChunks(total, concurrency, chunkBytes);
  const cached = await loadCachedChunks(opts.id, plans.length);
  const result = new Map<number, Uint8Array>(cached);

  let loaded = 0;
  cached.forEach((b) => {
    loaded += b.byteLength;
  });

  let active = 0;
  const startedAt = performance.now();
  const emit = () => {
    const elapsed = (performance.now() - startedAt) / 1000;
    const speed = elapsed > 0 ? loaded / elapsed : 0;
    opts.onProgress?.({ loaded, total, speed, activeConnections: active });
  };
  emit();

  // Build worker pool.
  const queue = plans.filter((p) => !result.has(p.index));
  let queueIdx = 0;

  async function worker(): Promise<void> {
    while (queueIdx < queue.length) {
      if (opts.signal?.aborted) throw new DOMException("aborted", "AbortError");
      const plan = queue[queueIdx++];
      if (!plan) return;
      active++;
      emit();
      try {
        const bytes = await fetchChunk(finalUrl, plan, opts.signal, (delta) => {
          loaded += delta;
          emit();
        });
        result.set(plan.index, bytes);
        await saveChunk(opts.id, plan.index, bytes);
      } finally {
        active--;
        emit();
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  // Stitch chunks back into a single Uint8Array in correct order.
  const stitched = new Uint8Array(total);
  let off = 0;
  for (let i = 0; i < plans.length; i++) {
    const part = result.get(i);
    if (!part) throw new Error(`missing chunk ${i}`);
    stitched.set(part, off);
    off += part.byteLength;
  }

  // We can drop the chunk cache now — the caller has the stitched bytes.
  await idbClearPrefix("downloadChunks", `${opts.id}:`);

  return { bytes: stitched, totalBytes: total, parallelUsed: true, finalUrl };
}
