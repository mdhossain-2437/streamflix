"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Search,
  Library,
  Loader2,
  Download,
  Check,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface ArchiveCard {
  identifier: string;
  title: string;
  description: string;
  creator: string | null;
  year: string | null;
  posterUrl: string;
}

export default function AdminImportArchivePage() {
  const { toast } = useToast();
  const [query, setQuery] = useState("public domain feature film");
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState<ArchiveCard[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    setSearching(true);
    try {
      const res = await fetch(
        `/api/archive/search?q=${encodeURIComponent(query)}&rows=24`,
      );
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = (await res.json()) as { items: ArchiveCard[] };
      setItems(data.items ?? []);
    } catch (err) {
      toast({
        title: "Search failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleImport() {
    if (selected.size === 0) return;
    setImporting(true);
    try {
      const res = await fetch("/api/archive/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers: Array.from(selected) }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = (await res.json()) as {
        imported: { identifier: string; id?: string; error?: string }[];
      };
      const ok = data.imported.filter((x) => x.id).length;
      const fail = data.imported.length - ok;
      toast({
        title: "Import complete",
        description: `${ok} imported${fail ? ` · ${fail} skipped` : ""}.`,
      });
      setSelected(new Set());
    } catch (err) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative pt-32 md:pt-36 px-4 md:px-8 lg:px-16 pb-16">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-radial-fade pointer-events-none" />

        <div className="relative mx-auto max-w-6xl space-y-8">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hover:bg-white/5"
            data-testid="button-back-admin"
          >
            <Link href="/admin">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to admin
            </Link>
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-3"
          >
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-primary">
              <Library className="w-3.5 h-3.5" />
              Internet Archive
            </span>
            <h1 className="font-display text-balance text-[clamp(2rem,5vw,3.5rem)] leading-[0.95] tracking-[0.005em]">
              Import public-domain films
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Search archive.org's catalog of public-domain feature films. Each
              import row stores source = internet_archive + the original
              identifier for traceability.
            </p>
          </motion.div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="public domain feature film"
              className="h-12 bg-white/[0.04] border-white/10"
              data-testid="input-search-query"
            />
            <Button
              type="submit"
              disabled={searching}
              className="h-12 px-6 rounded-full bg-primary text-primary-foreground hover:bg-primary-hover"
              data-testid="button-search"
            >
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </form>

          {items.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selected.size} of {items.length} selected
              </p>
              <Button
                onClick={handleImport}
                disabled={selected.size === 0 || importing}
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary-hover"
                data-testid="button-import-selected"
              >
                {importing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Import {selected.size > 0 ? `(${selected.size})` : ""}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.map((item) => {
              const isSelected = selected.has(item.identifier);
              return (
                <button
                  key={item.identifier}
                  type="button"
                  onClick={() => toggle(item.identifier)}
                  className={`group text-left relative rounded-xl overflow-hidden border transition-all duration-300 ${
                    isSelected
                      ? "border-primary shadow-glow-sm"
                      : "border-white/[0.08] hover:border-white/20"
                  }`}
                  data-testid={`archive-item-${item.identifier}`}
                >
                  <div className="aspect-[2/3] bg-muted overflow-hidden">
                    {item.posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-cinema"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-muted-foreground">
                        <Library className="w-12 h-12 opacity-30" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-black/60 backdrop-blur-md space-y-1">
                    <h3 className="text-sm font-medium line-clamp-2">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      {item.year && <span>{item.year}</span>}
                      {item.creator && (
                        <span className="line-clamp-1">{item.creator}</span>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-glow">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {items.length === 0 && !searching && (
            <div className="text-center py-20 space-y-3 text-muted-foreground">
              <Library className="w-12 h-12 mx-auto opacity-30" />
              <p>Search to see public-domain films from the Internet Archive.</p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
