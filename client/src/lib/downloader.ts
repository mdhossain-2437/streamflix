// StreamFlix downloader — downloads any direct MP4 source to the user's device,
// embeds permanent StreamFlix metadata into the file (title, artist, comment,
// album, encoder fields are populated so any player shows the StreamFlix
// branding), and saves with an auto-generated filename:
//
//   "StreamFlix - <Title> (<Year>).mp4"
//
// The metadata pass uses ffmpeg.wasm with -c copy (stream-copy, no re-encode)
// so even feature-length files finish in seconds.
//
// Optional "burn watermark" mode adds an on-screen "STREAMFLIX" text overlay
// using the drawtext filter. This requires re-encoding so it is slower; users
// must opt in by passing burnWatermark: true.
//
// ffmpeg.wasm core (~30MB) is dynamically imported only when downloadVideo()
// is first called. Subsequent downloads reuse the cached instance.

import type { FFmpeg } from "@ffmpeg/ffmpeg";

export interface DownloadOptions {
  /** Direct video URL. Must be CORS-accessible. MP4 / MKV / WebM all work. */
  url: string;
  /** Title shown in the saved filename and embedded metadata. */
  title: string;
  /** Optional release year, appended to the filename in parens. */
  year?: string | number | null;
  /** Optional release type (movie / series / episode), embedded as genre tag. */
  kind?: "movie" | "series" | "episode" | "trailer" | string;
  /** Episode label like "S01E03 - Pilot" — appended to title. */
  episode?: string;
  /** When true, burns a translucent "STREAMFLIX" watermark into the picture
   *  using ffmpeg's drawtext filter. Slower (real-time-ish re-encode). */
  burnWatermark?: boolean;
  /** Progress callback. `phase` is one of fetching|encoding|finalizing.
   *  `ratio` is 0..1. */
  onProgress?: (p: { phase: string; ratio: number; message?: string }) => void;
  /** Abort signal to cancel the download. */
  signal?: AbortSignal;
}

export interface DownloadResult {
  filename: string;
  bytes: number;
  blob: Blob;
}

const STREAMFLIX_BRAND = {
  artist: "StreamFlix",
  album: "StreamFlix Library",
  encoder: "StreamFlix Cinematic Player",
  copyright:
    "Downloaded via StreamFlix. Original work belongs to its respective owners.",
  publisher: "StreamFlix",
};

export class DownloadError extends Error {
  code: string;
  cause?: unknown;
  constructor(code: string, message: string, cause?: unknown) {
    super(message);
    this.code = code;
    this.cause = cause;
  }
}

let ffmpegPromise: Promise<FFmpeg> | null = null;

async function loadFfmpeg(): Promise<FFmpeg> {
  if (ffmpegPromise) return ffmpegPromise;
  ffmpegPromise = (async () => {
    const [{ FFmpeg: FFmpegCtor }, { toBlobURL }] = await Promise.all([
      import("@ffmpeg/ffmpeg"),
      import("@ffmpeg/util"),
    ]);
    const ffmpeg = new FFmpegCtor();
    const baseUrl = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseUrl}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(
        `${baseUrl}/ffmpeg-core.wasm`,
        "application/wasm",
      ),
    });
    return ffmpeg;
  })().catch((err) => {
    ffmpegPromise = null;
    throw new DownloadError(
      "FFMPEG_LOAD",
      "Failed to load StreamFlix media engine. Check your network.",
      err,
    );
  });
  return ffmpegPromise;
}

function sanitiseFilename(input: string): string {
  return input
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function buildFilename(
  title: string,
  year?: string | number | null,
  episode?: string,
  ext = "mp4",
): string {
  const parts: string[] = ["StreamFlix"];
  parts.push(`- ${sanitiseFilename(title)}`);
  if (episode) parts.push(`- ${sanitiseFilename(episode)}`);
  if (year) parts.push(`(${year})`);
  return `${parts.join(" ")}.${ext}`;
}

async function fetchAsBytes(
  url: string,
  onProgress?: DownloadOptions["onProgress"],
  signal?: AbortSignal,
): Promise<Uint8Array> {
  // Try our own server-side proxy first when available; it sets permissive
  // CORS headers and follows archive.org's CDN redirects server-side. Falls
  // back to a direct fetch when the proxy isn't reachable (static demo).
  const proxied = `/api/proxy/download?url=${encodeURIComponent(url)}`;
  let res: Response;
  try {
    res = await fetch(proxied, { signal, credentials: "omit" });
    if (!res.ok && res.status !== 502) {
      // Proxy responded but rejected; use direct.
      throw new Error(`proxy ${res.status}`);
    }
    if (res.status === 502) {
      res = await fetch(url, { signal, credentials: "omit" });
    }
  } catch {
    res = await fetch(url, { signal, credentials: "omit" });
  }
  if (!res.ok) {
    throw new DownloadError(
      "FETCH",
      `Download failed: ${res.status} ${res.statusText}`,
    );
  }
  const total = Number(res.headers.get("content-length") || "0") || 0;
  const reader = res.body?.getReader();
  if (!reader) {
    const buf = new Uint8Array(await res.arrayBuffer());
    onProgress?.({ phase: "fetching", ratio: 1, message: "Source loaded" });
    return buf;
  }
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    if (total > 0) {
      onProgress?.({
        phase: "fetching",
        ratio: Math.min(0.5, loaded / total / 2),
        message: `Downloaded ${(loaded / 1024 / 1024).toFixed(1)} MB`,
      });
    } else {
      onProgress?.({
        phase: "fetching",
        ratio: 0,
        message: `Downloaded ${(loaded / 1024 / 1024).toFixed(1)} MB`,
      });
    }
  }
  const out = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  onProgress?.({
    phase: "fetching",
    ratio: 0.5,
    message: `Downloaded ${(loaded / 1024 / 1024).toFixed(1)} MB`,
  });
  return out;
}

function inferExtension(url: string): string {
  try {
    const path = new URL(url, location.href).pathname.toLowerCase();
    const m = path.match(/\.(mp4|m4v|mov|webm|mkv|avi|ogv)(?:$|\?)/);
    return m ? m[1] : "mp4";
  } catch {
    return "mp4";
  }
}

function buildMetadataArgs(opts: DownloadOptions): string[] {
  const fullTitle = opts.episode
    ? `${opts.title} - ${opts.episode}`
    : opts.title;
  const tags: Record<string, string> = {
    title: `StreamFlix - ${fullTitle}${opts.year ? ` (${opts.year})` : ""}`,
    artist: STREAMFLIX_BRAND.artist,
    album: STREAMFLIX_BRAND.album,
    album_artist: STREAMFLIX_BRAND.artist,
    composer: STREAMFLIX_BRAND.artist,
    copyright: STREAMFLIX_BRAND.copyright,
    encoder: STREAMFLIX_BRAND.encoder,
    publisher: STREAMFLIX_BRAND.publisher,
    comment: `Downloaded from StreamFlix on ${new Date().toISOString().slice(0, 10)}`,
    description: `${fullTitle}${opts.year ? ` (${opts.year})` : ""} — StreamFlix`,
    show: opts.kind === "series" ? opts.title : "",
    genre: opts.kind || "",
    date: opts.year ? String(opts.year) : "",
  };
  const args: string[] = [];
  for (const [k, v] of Object.entries(tags)) {
    if (!v) continue;
    args.push("-metadata", `${k}=${v}`);
  }
  return args;
}

function buildWatermarkArg(): string[] {
  // Burned-in "STREAMFLIX" wordmark in the bottom-right corner. The font
  // shipped with ffmpeg-core is a generic Liberation Sans which is enough for
  // a clean watermark.
  const text = "STREAMFLIX";
  // drawtext with no font file uses the built-in default font.
  const filter =
    `drawtext=text='${text}':` +
    `fontcolor=white@0.75:` +
    `fontsize=h/22:` +
    `box=1:boxcolor=black@0.35:boxborderw=12:` +
    `x=w-tw-30:y=h-th-30`;
  return ["-vf", filter, "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23", "-c:a", "copy"];
}

function triggerSave(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1500);
}

/**
 * Download a video to the user's device, branded as StreamFlix.
 *
 * The default fast path (~1-3 seconds for any size):
 *   ffmpeg -i in.mp4 -c copy -metadata title=… -metadata artist=StreamFlix … out.mp4
 *
 * Optional burnWatermark adds a translucent "STREAMFLIX" wordmark in the
 * bottom-right corner of every frame. Slower (re-encode required).
 */
export async function downloadVideo(
  opts: DownloadOptions,
): Promise<DownloadResult> {
  if (!opts.url) throw new DownloadError("INPUT", "No source URL provided");
  if (opts.signal?.aborted) {
    throw new DownloadError("ABORT", "Download cancelled");
  }

  const filename = buildFilename(opts.title, opts.year, opts.episode, "mp4");
  const inputExt = inferExtension(opts.url);

  let bytes: Uint8Array;
  try {
    bytes = await fetchAsBytes(opts.url, opts.onProgress, opts.signal);
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new DownloadError("ABORT", "Download cancelled");
    }
    // Cross-origin (CORS) blocked: fall back to a native browser download via
    // a hidden <a download> click. Cross-origin filename rewriting is ignored
    // by browsers per spec, so the file lands with archive.org's name. The
    // user still gets the file and we surface a soft message.
    try {
      const a = document.createElement("a");
      a.href = opts.url;
      a.download = filename;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 1500);
    } catch {
      /* ignore */
    }
    throw new DownloadError(
      "FETCH_FALLBACK",
      "Cross-origin download blocked by the source host. Started a native browser download instead — the file may not include embedded StreamFlix metadata.",
      err,
    );
  }

  if (opts.signal?.aborted) {
    throw new DownloadError("ABORT", "Download cancelled");
  }

  let ffmpeg: FFmpeg;
  try {
    ffmpeg = await loadFfmpeg();
  } catch (err) {
    // If ffmpeg.wasm cannot load (rare — usually network blocked), fall back
    // to a raw blob save with the StreamFlix filename. Metadata won't be
    // embedded but the user still gets the file.
    const blob = new Blob([bytes as BlobPart], { type: "video/mp4" });
    triggerSave(blob, filename);
    throw new DownloadError(
      "FFMPEG_LOAD_FALLBACK",
      "StreamFlix media engine unavailable; saved raw file without embedded metadata.",
      err,
    );
  }

  opts.onProgress?.({
    phase: "encoding",
    ratio: 0.55,
    message: opts.burnWatermark
      ? "Burning StreamFlix watermark…"
      : "Embedding StreamFlix metadata…",
  });

  const inFile = `in.${inputExt}`;
  const outFile = "out.mp4";
  await ffmpeg.writeFile(inFile, bytes);

  const args: string[] = ["-i", inFile];
  if (opts.burnWatermark) {
    args.push(...buildWatermarkArg());
  } else {
    args.push("-c", "copy");
  }
  args.push(...buildMetadataArgs(opts));
  args.push("-movflags", "+faststart");
  args.push("-y", outFile);

  const onProg = ({ progress }: { progress: number }) => {
    if (!opts.onProgress) return;
    const ratio = 0.55 + Math.max(0, Math.min(1, progress)) * 0.4;
    opts.onProgress({
      phase: "encoding",
      ratio,
      message: opts.burnWatermark ? "Burning watermark" : "Embedding metadata",
    });
  };
  ffmpeg.on("progress", onProg);
  try {
    await ffmpeg.exec(args);
  } catch (err) {
    ffmpeg.off("progress", onProg);
    // Cleanup
    try {
      await ffmpeg.deleteFile(inFile);
    } catch {
      /* no-op */
    }
    // Fallback: save raw file
    const blob = new Blob([bytes as BlobPart], { type: "video/mp4" });
    triggerSave(blob, filename);
    throw new DownloadError(
      "FFMPEG_EXEC_FALLBACK",
      "StreamFlix encoder failed; saved raw file without embedded metadata.",
      err,
    );
  }
  ffmpeg.off("progress", onProg);

  const data = await ffmpeg.readFile(outFile);
  await Promise.all([
    ffmpeg.deleteFile(inFile).catch(() => undefined),
    ffmpeg.deleteFile(outFile).catch(() => undefined),
  ]);

  opts.onProgress?.({
    phase: "finalizing",
    ratio: 0.97,
    message: "Saving to device",
  });

  const out =
    data instanceof Uint8Array
      ? data
      : new TextEncoder().encode(data as string);
  const blob = new Blob([out as BlobPart], { type: "video/mp4" });
  triggerSave(blob, filename);

  opts.onProgress?.({ phase: "finalizing", ratio: 1, message: "Saved" });

  return { filename, bytes: blob.size, blob };
}

/**
 * Lightweight check — returns true if the URL looks like a direct progressive
 * video file (mp4 / m4v / webm / mov). HLS playlists (.m3u8) are NOT
 * downloadable through this path; we surface a friendly message in the UI.
 */
export function isDownloadableSource(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const path = new URL(url, location.href).pathname.toLowerCase();
    return /\.(mp4|m4v|mov|webm|mkv|avi|ogv)(?:$|\?)/.test(path);
  } catch {
    return false;
  }
}
