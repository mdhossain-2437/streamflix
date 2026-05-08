// Persistent download queue UI — opens from a button in the navbar. Shows
// every active / paused / failed / done download with live throughput,
// progress bar, ETA, active-connection count, and pause / resume / cancel /
// remove controls. Survives page reloads by hydrating from IndexedDB.

import { useMemo } from "react";
import { Download, Pause, Play, Trash2, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  downloadQueue,
  useDownloadQueue,
  type DownloadJob,
} from "@/lib/downloadQueue";

function fmtBytes(n: number): string {
  if (!n) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function fmtSpeed(n: number): string {
  if (!n || n < 1024) return "0 KB/s";
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB/s`;
  return `${(n / 1024 ** 2).toFixed(2)} MB/s`;
}

function fmtEta(loaded: number, total: number, speed: number): string {
  if (!speed || total <= loaded) return "—";
  const remaining = (total - loaded) / speed;
  if (remaining < 60) return `${Math.ceil(remaining)}s`;
  if (remaining < 3600) return `${Math.ceil(remaining / 60)}m`;
  return `${Math.floor(remaining / 3600)}h ${Math.ceil((remaining % 3600) / 60)}m`;
}

function statusColor(s: DownloadJob["status"]): string {
  switch (s) {
    case "running": return "text-emerald-400";
    case "queued": return "text-blue-400";
    case "paused": return "text-amber-400";
    case "done": return "text-emerald-400";
    case "failed": return "text-rose-400";
    case "cancelled": return "text-zinc-500";
  }
}

function JobRow({ job }: { job: DownloadJob }) {
  const pct = job.total > 0 ? Math.min(100, (job.loaded / job.total) * 100) : 0;
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-lg p-3 space-y-2" data-testid={`download-job-${job.id}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate text-white">
            {job.title}
            {job.year ? <span className="text-white/50 ml-1">({job.year})</span> : null}
          </div>
          <div className={`text-[11px] uppercase tracking-wide ${statusColor(job.status)}`}>
            {job.status === "done" && (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Saved as {job.savedAs}
              </span>
            )}
            {job.status === "failed" && (
              <span className="inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {job.error || "Failed"}
              </span>
            )}
            {job.status === "running" && (
              <span>{fmtSpeed(job.speed)} · {job.activeConnections || 0} streams</span>
            )}
            {job.status === "paused" && <span>Paused at {pct.toFixed(0)}%</span>}
            {job.status === "queued" && <span>Queued…</span>}
            {job.status === "cancelled" && <span>Cancelled</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {job.status === "running" && (
            <Button variant="ghost" size="icon" className="size-7" onClick={() => downloadQueue.pause(job.id)} title="Pause">
              <Pause className="w-3.5 h-3.5" />
            </Button>
          )}
          {(job.status === "paused" || job.status === "failed") && (
            <Button variant="ghost" size="icon" className="size-7" onClick={() => downloadQueue.resume(job.id)} title="Resume">
              <Play className="w-3.5 h-3.5" />
            </Button>
          )}
          {(job.status === "running" || job.status === "queued" || job.status === "paused") && (
            <Button variant="ghost" size="icon" className="size-7 text-rose-300" onClick={() => downloadQueue.cancel(job.id)} title="Cancel">
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
          {(job.status === "done" || job.status === "failed" || job.status === "cancelled") && (
            <Button variant="ghost" size="icon" className="size-7 text-zinc-300" onClick={() => downloadQueue.remove(job.id)} title="Remove">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
      {job.status !== "done" && job.status !== "cancelled" && job.status !== "failed" && (
        <div className="space-y-1">
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary via-pink-500 to-amber-400 transition-[width] duration-150"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/50 tabular-nums">
            <span>{fmtBytes(job.loaded)} / {fmtBytes(job.total) || "—"}</span>
            <span>ETA {fmtEta(job.loaded, job.total, job.speed)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function DownloadQueuePanel() {
  const jobs = useDownloadQueue();
  const active = useMemo(
    () => jobs.filter((j) => j.status === "running" || j.status === "queued").length,
    [jobs],
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Downloads"
          data-testid="download-queue-button"
        >
          <Download className="w-5 h-5" />
          {active > 0 && (
            <Badge
              variant="default"
              className="absolute -top-1 -right-1 px-1.5 py-0 text-[10px] h-4 min-w-[16px] bg-primary text-primary-foreground"
            >
              {active}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md bg-background/95 backdrop-blur-xl border-white/10 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Downloads</SheetTitle>
          <SheetDescription>
            Multi-stream parallel downloads with resume, queue, and StreamFlix metadata branding.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {jobs.length === 0 && (
            <div className="text-center py-12 text-white/40 text-sm">
              No downloads yet.<br />
              Click the download icon on any video to start.
            </div>
          )}
          {jobs.map((j) => <JobRow key={j.id} job={j} />)}
        </div>
      </SheetContent>
    </Sheet>
  );
}
