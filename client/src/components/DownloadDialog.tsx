import { useEffect, useRef, useState } from "react";
import { Download, X, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  downloadVideo,
  buildFilename,
  isDownloadableSource,
  type DownloadOptions,
} from "@/lib/downloader";

interface Props {
  open: boolean;
  onClose: () => void;
  source: string | null;
  title: string;
  year?: string | number | null;
  kind?: "movie" | "series" | "episode";
  episode?: string;
}

type Phase = "idle" | "running" | "done" | "error";

export function DownloadDialog({
  open,
  onClose,
  source,
  title,
  year,
  kind = "movie",
  episode,
}: Props) {
  const [burn, setBurn] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [ratio, setRatio] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) {
      setPhase("idle");
      setRatio(0);
      setMessage("");
      setError(null);
      setResult(null);
      abortRef.current?.abort();
      abortRef.current = null;
    }
  }, [open]);

  const filename = buildFilename(title, year, episode, "mp4");
  const downloadable = isDownloadableSource(source);

  const start = async () => {
    if (!source) return;
    setPhase("running");
    setError(null);
    setRatio(0);
    setMessage("Connecting to source…");
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const opts: DownloadOptions = {
        url: source,
        title,
        year,
        kind,
        episode,
        burnWatermark: burn,
        onProgress: ({ ratio: r, message: m }) => {
          setRatio(r);
          if (m) setMessage(m);
        },
        signal: ac.signal,
      };
      const out = await downloadVideo(opts);
      setPhase("done");
      setRatio(1);
      setResult(out.filename);
      setMessage(`Saved · ${(out.bytes / 1024 / 1024).toFixed(1)} MB`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setPhase("error");
      setError(msg);
    } finally {
      abortRef.current = null;
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    setPhase("idle");
    setRatio(0);
    setMessage("");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          data-testid="download-dialog"
        >
          <motion.div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Download className="h-5 w-5" /> Download to your device
                </h3>
                <p className="mt-1 text-sm text-white/60">
                  Auto-named with permanent StreamFlix branding embedded in the file.
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white transition"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[10px] uppercase tracking-wide text-white/40">
                Saving as
              </div>
              <div className="mt-1 truncate font-mono text-sm text-white">
                {filename}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/50">
                <span>Title</span>
                <span className="text-white/80 truncate">StreamFlix - {title}{year ? ` (${year})` : ""}</span>
                <span>Artist</span>
                <span className="text-white/80">StreamFlix</span>
                <span>Album</span>
                <span className="text-white/80">StreamFlix Library</span>
                <span>Encoder</span>
                <span className="text-white/80">StreamFlix Cinematic Player</span>
              </div>
            </div>

            <label
              className={`mt-4 flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                burn
                  ? "border-rose-500/40 bg-rose-500/10"
                  : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
              }`}
            >
              <input
                type="checkbox"
                checked={burn}
                onChange={(e) => setBurn(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-rose-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-white">
                  Burn STREAMFLIX watermark into the video
                </div>
                <div className="mt-0.5 text-xs text-white/50">
                  Translucent text in the bottom-right corner of every frame.
                  Re-encodes the video — slower, but the brand never washes
                  out. Default leaves picture untouched and only embeds metadata
                  (instant).
                </div>
              </div>
            </label>

            {!downloadable && source && (
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  Direct download isn't supported for this source (likely an
                  HLS stream). Free archive titles and trailer MP4s download
                  without issues.
                </div>
              </div>
            )}

            {phase === "running" && (
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {message || "Working…"}
                  </span>
                  <span>{Math.round(ratio * 100)}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-500 transition-[width] duration-300"
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              </div>
            )}

            {phase === "done" && (
              <div className="mt-5 flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                <CheckCircle2 className="h-5 w-5" />
                <div>
                  <div className="font-medium">Saved to your device.</div>
                  <div className="text-xs opacity-80">{result || message}</div>
                </div>
              </div>
            )}

            {phase === "error" && error && (
              <div className="mt-5 flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Download failed</div>
                  <div className="mt-1 text-xs opacity-80">{error}</div>
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              {phase === "running" ? (
                <button
                  onClick={cancel}
                  className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 transition"
                >
                  Cancel
                </button>
              ) : phase === "done" ? (
                <button
                  onClick={onClose}
                  className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 transition"
                >
                  Close
                </button>
              ) : (
                <>
                  <button
                    onClick={onClose}
                    className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={start}
                    disabled={!source || !downloadable}
                    className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-rose-500 to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white shadow hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="h-4 w-4" />
                    Start download
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
