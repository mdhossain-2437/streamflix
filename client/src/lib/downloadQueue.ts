// Persistent download queue. Backs the DownloadQueuePanel UI.
//
// Job lifecycle:
//   queued -> running -> done (or failed | paused | cancelled)
//
// Persistence: every state transition writes to IndexedDB (`downloads` store).
// Chunk bytes (potentially hundreds of MB) live in `downloadChunks`. On page
// reload we restore the queue from `downloads` and resume any non-terminal
// jobs from their last completed chunks.
//
// This module is a singleton; React components subscribe to state via
// `useDownloadQueue()`.

import { useEffect, useState } from "react";
import { idbDelete, idbGetAll, idbSet } from "@/lib/idbStore";
import { parallelDownload } from "@/lib/parallelDownloader";
import { downloadVideo, type DownloadOptions } from "@/lib/downloader";

export type JobStatus =
  | "queued"
  | "running"
  | "paused"
  | "done"
  | "failed"
  | "cancelled";

export interface DownloadJob {
  id: string;
  url: string;
  title: string;
  year?: string | number | null;
  episode?: string;
  kind?: DownloadOptions["kind"];
  status: JobStatus;
  /** Bytes downloaded across all chunks. */
  loaded: number;
  /** Total bytes (0 if unknown until first probe). */
  total: number;
  /** Bytes/sec EWMA. */
  speed: number;
  /** Concurrent connection count requested. */
  concurrency: number;
  /** Burn watermark on the final encode? */
  burnWatermark: boolean;
  /** Most recent error message (if status === failed). */
  error?: string;
  /** Wall-clock ms when the job was created. */
  createdAt: number;
  /** Wall-clock ms of most recent state change. */
  updatedAt: number;
  /** Resulting filename once saved. */
  savedAs?: string;
  /** Active connection count for live UI display. */
  activeConnections?: number;
}

type Listener = (jobs: DownloadJob[]) => void;

class QueueManager {
  private jobs = new Map<string, DownloadJob>();
  private aborts = new Map<string, AbortController>();
  private listeners = new Set<Listener>();
  private hydrated = false;
  private hydratePromise: Promise<void> | null = null;

  async hydrate(): Promise<void> {
    if (this.hydrated) return;
    if (this.hydratePromise) return this.hydratePromise;
    this.hydratePromise = (async () => {
      try {
        const stored = await idbGetAll<DownloadJob>("downloads");
        for (const j of stored) {
          // Anything that was running when the tab closed is now paused —
          // the user can resume.
          if (j.status === "running") j.status = "paused";
          this.jobs.set(j.id, j);
        }
      } catch {
        // IndexedDB unavailable (private mode etc.) — degrade gracefully.
      }
      this.hydrated = true;
      this.emit();
    })();
    return this.hydratePromise;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.list());
    return () => {
      this.listeners.delete(fn);
    };
  }

  list(): DownloadJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  private emit(): void {
    const snap = this.list();
    this.listeners.forEach((fn) => fn(snap));
  }

  private async persist(job: DownloadJob): Promise<void> {
    job.updatedAt = Date.now();
    this.jobs.set(job.id, job);
    try {
      await idbSet<DownloadJob>("downloads", job.id, job);
    } catch {
      /* ignore */
    }
    this.emit();
  }

  async enqueue(job: Omit<DownloadJob, "status" | "loaded" | "total" | "speed" | "createdAt" | "updatedAt">): Promise<DownloadJob> {
    await this.hydrate();
    const full: DownloadJob = {
      ...job,
      status: "queued",
      loaded: 0,
      total: 0,
      speed: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await this.persist(full);
    void this.run(full.id);
    return full;
  }

  async resume(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;
    if (job.status === "done" || job.status === "running") return;
    job.status = "queued";
    job.error = undefined;
    await this.persist(job);
    void this.run(id);
  }

  async pause(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job || job.status !== "running") return;
    this.aborts.get(id)?.abort();
    this.aborts.delete(id);
    job.status = "paused";
    await this.persist(job);
  }

  async cancel(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;
    this.aborts.get(id)?.abort();
    this.aborts.delete(id);
    job.status = "cancelled";
    await this.persist(job);
  }

  async remove(id: string): Promise<void> {
    this.aborts.get(id)?.abort();
    this.aborts.delete(id);
    this.jobs.delete(id);
    try {
      await idbDelete("downloads", id);
    } catch {
      /* ignore */
    }
    this.emit();
  }

  private async run(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;
    if (job.status === "running" || job.status === "done") return;

    job.status = "running";
    await this.persist(job);

    const ac = new AbortController();
    this.aborts.set(id, ac);

    try {
      // Phase 1: parallel chunked fetch into memory (resumable).
      const result = await parallelDownload({
        url: job.url,
        id: job.id,
        concurrency: job.concurrency,
        signal: ac.signal,
        onProgress: ({ loaded, total, speed, activeConnections }) => {
          const j = this.jobs.get(id);
          if (!j) return;
          j.loaded = loaded;
          j.total = total;
          j.speed = speed;
          j.activeConnections = activeConnections;
          this.jobs.set(id, j);
          this.emit();
        },
      });

      // Phase 2: hand the bytes to the StreamFlix-branded downloader for
      // metadata embed + optional watermark + save-to-device.
      const blobUrl = URL.createObjectURL(
        new Blob([result.bytes as BlobPart], { type: "video/mp4" }),
      );
      try {
        const out = await downloadVideo({
          url: blobUrl,
          title: job.title,
          year: job.year,
          episode: job.episode,
          kind: job.kind,
          burnWatermark: job.burnWatermark,
          signal: ac.signal,
        });
        job.savedAs = out.filename;
        job.total = out.bytes || result.totalBytes;
        job.loaded = job.total;
      } finally {
        URL.revokeObjectURL(blobUrl);
      }

      job.status = "done";
      job.speed = 0;
      job.activeConnections = 0;
      await this.persist(job);
    } catch (err) {
      const msg = (err as Error).message || String(err);
      // AbortError is intentional pause/cancel — don't mark failed.
      if ((err as Error).name === "AbortError" || /aborted/i.test(msg)) {
        if (job.status === "running") job.status = "paused";
      } else {
        job.status = "failed";
        job.error = msg;
      }
      job.activeConnections = 0;
      job.speed = 0;
      await this.persist(job);
    } finally {
      this.aborts.delete(id);
    }
  }
}

export const downloadQueue = new QueueManager();

// Auto-hydrate on import so the queue panel sees pre-existing jobs immediately.
if (typeof window !== "undefined") {
  void downloadQueue.hydrate();
}

export function useDownloadQueue(): DownloadJob[] {
  const [jobs, setJobs] = useState<DownloadJob[]>(() => downloadQueue.list());
  useEffect(() => downloadQueue.subscribe(setJobs), []);
  return jobs;
}
