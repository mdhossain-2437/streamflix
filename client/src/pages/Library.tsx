// My Library — user-supplied stream URLs. Persists across reloads via
// IndexedDB. Plex/Jellyfin/Emby model: the operator supplies legitimately
// licensed content, StreamFlix is just the player + downloader.

import { useState } from "react";
import { motion } from "framer-motion";
import { FilePlus, Library as LibraryIcon, Trash2, Edit3, Play, Download as DownloadIcon, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  addLibraryItem,
  detectKind,
  removeLibraryItem,
  updateLibraryItem,
  useMyLibrary,
  type MyLibraryItem,
} from "@/lib/myLibrary";
import { downloadQueue } from "@/lib/downloadQueue";
import { isDownloadableSource } from "@/lib/downloader";

interface FormState {
  title: string;
  year: string;
  description: string;
  videoUrl: string;
  coverUrl: string;
  tags: string;
  kind: "movie" | "series" | "episode" | "custom";
}

const EMPTY_FORM: FormState = {
  title: "",
  year: "",
  description: "",
  videoUrl: "",
  coverUrl: "",
  tags: "",
  kind: "movie",
};

function ItemRow({ item }: { item: MyLibraryItem }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>({
    title: item.title,
    year: item.year ?? "",
    description: item.description ?? "",
    videoUrl: item.videoUrl,
    coverUrl: item.coverUrl ?? "",
    tags: item.tags.join(", "),
    kind: item.kind,
  });
  const kindHint = detectKind(item.videoUrl);

  const save = async () => {
    await updateLibraryItem({
      ...item,
      title: form.title.trim() || item.title,
      year: form.year.trim() || undefined,
      description: form.description.trim() || undefined,
      videoUrl: form.videoUrl.trim(),
      coverUrl: form.coverUrl.trim() || undefined,
      kind: form.kind,
      tags: form.tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setEditing(false);
  };

  const queueDl = async () => {
    if (!isDownloadableSource(item.videoUrl)) return;
    await downloadQueue.enqueue({
      id: `dl-lib-${item.id}-${Date.now().toString(36)}`,
      url: item.videoUrl,
      title: item.title,
      year: item.year,
      kind: "movie",
      concurrency: 4,
      burnWatermark: false,
    });
  };

  if (editing) {
    return (
      <div className="border border-white/10 rounded-xl bg-white/[0.04] p-4 space-y-3">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full bg-white/[0.04] border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/40" />
        <div className="grid grid-cols-2 gap-2">
          <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="Year" className="bg-white/[0.04] border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/40" />
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as FormState["kind"] })} className="bg-white/[0.04] border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/40">
            <option value="movie">Movie</option>
            <option value="series">Series</option>
            <option value="episode">Episode</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={2} className="w-full bg-white/[0.04] border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/40" />
        <input value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="Video URL (MP4 / WebM / HLS .m3u8)" className="w-full bg-white/[0.04] border border-white/10 rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-primary/40" />
        <input value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} placeholder="Cover image URL (optional)" className="w-full bg-white/[0.04] border border-white/10 rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-primary/40" />
        <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags (comma-separated)" className="w-full bg-white/[0.04] border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/40" />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-white/10 rounded-xl bg-white/[0.04] p-4 flex gap-4" data-testid={`library-item-${item.id}`}>
      <div className="w-16 h-24 rounded-md overflow-hidden bg-white/5 shrink-0">
        {item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt={item.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <LibraryIcon className="w-6 h-6 text-white/30" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">
              {item.title}
              {item.year && <span className="text-white/40 ml-2">({item.year})</span>}
            </div>
            <div className="text-[11px] uppercase tracking-wide text-white/40 mt-0.5">
              {item.kind} · {kindHint.toUpperCase()}
            </div>
            {item.description && (
              <p className="text-xs text-white/60 mt-1 line-clamp-2">{item.description}</p>
            )}
            {item.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-2">
                {item.tags.map((t) => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/70">{t}</span>
                ))}
              </div>
            )}
            <div className="text-[10px] text-white/30 mt-2 truncate font-mono">{item.videoUrl}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-3">
          <Link href={`/library/watch/${item.id}`}>
            <Button size="sm" className="gap-1.5"><Play className="w-3.5 h-3.5" /> Play</Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onClick={queueDl}
            disabled={!isDownloadableSource(item.videoUrl)}
            className="gap-1.5"
            title={isDownloadableSource(item.videoUrl) ? "Queue download" : "Direct download not supported for HLS"}
          >
            <DownloadIcon className="w-3.5 h-3.5" /> Download
          </Button>
          <a
            href={item.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-white/60 hover:text-white"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open
          </a>
          <div className="ml-auto flex items-center gap-1">
            <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditing(true)}>
              <Edit3 className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-rose-300"
              onClick={() => {
                if (confirm(`Remove "${item.title}" from your library?`)) {
                  void removeLibraryItem(item.id);
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Library() {
  const items = useMyLibrary();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [adding, setAdding] = useState(false);

  const submit = async () => {
    if (!form.title.trim() || !form.videoUrl.trim()) return;
    await addLibraryItem({
      title: form.title.trim(),
      year: form.year.trim() || undefined,
      description: form.description.trim() || undefined,
      videoUrl: form.videoUrl.trim(),
      coverUrl: form.coverUrl.trim() || undefined,
      kind: form.kind,
      tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
    });
    setForm(EMPTY_FORM);
    setAdding(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="relative pt-32 md:pt-36 px-4 md:px-8 lg:px-16 pb-16">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-radial-fade pointer-events-none" />
        <div className="relative space-y-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-3"
          >
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
              My Library
            </span>
            <h1
              className="font-display text-balance text-[clamp(2rem,5vw,3.5rem)] leading-[1] tracking-[0.005em]"
              data-testid="text-page-title"
            >
              Your stream URLs, your library
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Paste any direct video URL you have rights to (MP4 / WebM / HLS) and StreamFlix will play it through the same advanced player and download it through the same parallel downloader as the public-domain catalog. Saved to your browser's IndexedDB — never leaves your device.
            </p>
          </motion.div>

          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            {!adding ? (
              <Button onClick={() => setAdding(true)} className="gap-2" data-testid="add-library-item">
                <FilePlus className="w-4 h-4" />
                Add stream
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">New stream</h3>
                  <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setForm(EMPTY_FORM); }}>Cancel</Button>
                </div>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title (e.g. The Big Lebowski)" className="w-full bg-white/[0.04] border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/40" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="Year" className="bg-white/[0.04] border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/40" />
                  <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as FormState["kind"] })} className="bg-white/[0.04] border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/40">
                    <option value="movie">Movie</option>
                    <option value="series">Series</option>
                    <option value="episode">Episode</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" rows={2} className="w-full bg-white/[0.04] border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/40" />
                <input value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="Video URL — MP4, WebM, or HLS .m3u8" className="w-full bg-white/[0.04] border border-white/10 rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-primary/40" />
                <input value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} placeholder="Cover image URL (optional)" className="w-full bg-white/[0.04] border border-white/10 rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-primary/40" />
                <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags, comma-separated (action, sci-fi)" className="w-full bg-white/[0.04] border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/40" />
                <div className="flex justify-end">
                  <Button onClick={submit} disabled={!form.title.trim() || !form.videoUrl.trim()} className="gap-2">
                    <FilePlus className="w-4 h-4" />
                    Add to library
                  </Button>
                </div>
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-16 text-white/40">
              No library items yet.<br />
              Click "Add stream" to add your first.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => <ItemRow key={item.id} item={item} />)}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
