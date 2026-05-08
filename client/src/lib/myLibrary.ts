// "My Library" — user-supplied stream URLs. Saved to IndexedDB so the list
// persists across reloads and devices (per-browser). Items here surface in
// the Free page catalog and play through the AdvancedPlayer just like
// archive.org titles. Users are responsible for the rights to anything they
// add — this is the same model as Plex / Jellyfin / Emby.

import { useEffect, useState } from "react";
import { idbDelete, idbGetAll, idbSet } from "@/lib/idbStore";

export interface MyLibraryItem {
  id: string;             // "lib-<uuid>"
  title: string;
  year?: string;
  description?: string;
  posterUrl?: string;
  /** Direct video URL — MP4, WebM, or HLS .m3u8 (HLS plays through hls.js). */
  videoUrl: string;
  /** Optional separate poster image URL. */
  coverUrl?: string;
  kind: "movie" | "series" | "episode" | "custom";
  /** Tags for filtering. */
  tags: string[];
  createdAt: number;
}

const STORE = "myLibrary";
type Listener = (items: MyLibraryItem[]) => void;
const listeners = new Set<Listener>();
let cache: MyLibraryItem[] | null = null;

export async function listLibrary(): Promise<MyLibraryItem[]> {
  if (cache) return cache;
  try {
    const items = await idbGetAll<MyLibraryItem>(STORE);
    cache = items.sort((a, b) => b.createdAt - a.createdAt);
    return cache;
  } catch {
    cache = [];
    return cache;
  }
}

export async function addLibraryItem(input: Omit<MyLibraryItem, "id" | "createdAt">): Promise<MyLibraryItem> {
  const item: MyLibraryItem = {
    ...input,
    id: `lib-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  try {
    await idbSet<MyLibraryItem>(STORE, item.id, item);
  } catch {
    /* ignore */
  }
  cache = null;
  await emit();
  return item;
}

export async function updateLibraryItem(item: MyLibraryItem): Promise<void> {
  try {
    await idbSet<MyLibraryItem>(STORE, item.id, item);
  } catch {
    /* ignore */
  }
  cache = null;
  await emit();
}

export async function removeLibraryItem(id: string): Promise<void> {
  try {
    await idbDelete(STORE, id);
  } catch {
    /* ignore */
  }
  cache = null;
  await emit();
}

export async function getLibraryItem(id: string): Promise<MyLibraryItem | undefined> {
  const items = await listLibrary();
  return items.find((i) => i.id === id);
}

async function emit(): Promise<void> {
  const items = await listLibrary();
  listeners.forEach((fn) => fn(items));
}

export function subscribeLibrary(fn: Listener): () => void {
  listeners.add(fn);
  void listLibrary().then((items) => fn(items));
  return () => {
    listeners.delete(fn);
  };
}

export function useMyLibrary(): MyLibraryItem[] {
  const [items, setItems] = useState<MyLibraryItem[]>([]);
  useEffect(() => subscribeLibrary(setItems), []);
  return items;
}

/** Detect kind from URL (HLS = streamable; MP4/WebM = downloadable + playable). */
export function detectKind(url: string): "hls" | "mp4" | "webm" | "other" {
  const path = url.split("?")[0].toLowerCase();
  if (path.endsWith(".m3u8")) return "hls";
  if (/\.(mp4|m4v)$/.test(path)) return "mp4";
  if (path.endsWith(".webm")) return "webm";
  return "other";
}
