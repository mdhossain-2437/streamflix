// Free / public-domain movies — sourced from the Internet Archive.
// Real streamable URLs. No subscription. No DRM.
//
// Layout: a search box that searches the entire archive when typed, OR
// when empty shows ~11 curated genre rows (Classic Westerns, Silent Cinema,
// Classic Animation, NASA Archive, Library of Congress, etc.). Each row
// scrolls horizontally; "View all" expands the row to a full-grid page.
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Search } from "lucide-react";
import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContentCard, ContentCardSkeleton } from "@/components/ContentCard";
import {
  useArchiveCurated,
  useArchiveSearch,
  type ArchiveItem,
} from "@/lib/api";
import { archiveToContent } from "@/lib/tmdbAdapter";

function CuratedRow({
  label,
  description,
  items,
  rowId,
}: {
  label: string;
  description: string;
  items: ArchiveItem[];
  rowId: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  if (!items.length) return null;
  return (
    <section className="space-y-3" data-testid={`row-${rowId}`}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight">{label}</h2>
          <p className="text-xs md:text-sm text-muted-foreground">{description}</p>
        </div>
        <Link
          href={`/free/row/${rowId}`}
          className="hidden md:inline-flex items-center gap-1 text-xs font-medium text-white/60 hover:text-white"
          data-testid={`row-${rowId}-view-all`}
        >
          View all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div
        ref={scrollRef}
        className="-mx-4 md:mx-0 px-4 md:px-0 flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
      >
        {items.map((m) => (
          <div
            key={m.id}
            className="snap-start shrink-0 w-[140px] sm:w-[160px] md:w-[180px]"
          >
            <ContentCard content={archiveToContent(m)} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Free() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const searching = debouncedQuery.trim().length >= 2;

  const curated = useArchiveCurated({ limit: 16 });
  const search = useArchiveSearch(debouncedQuery, { limit: 36, page: 1 });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative pt-32 md:pt-36 px-4 md:px-8 lg:px-16 pb-16">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-radial-fade pointer-events-none" />

        <div className="relative space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-3"
          >
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
              Free · Public Domain
            </span>
            <h1
              className="font-display text-balance text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.95] tracking-[0.005em]"
              data-testid="text-page-title"
            >
              Always Free Cinema
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Public-domain classics from the Internet Archive, NASA, and the
              Library of Congress. Real streamable MP4 sources, no
              subscription, no DRM. Westerns, silent cinema, classic
              animation, film noir, mid-century industrial reels, and more.
            </p>
          </motion.div>

          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the archive — Chaplin, Hitchcock, noir, sci-fi…"
              className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white/[0.04] border border-white/10 hover:bg-white/[0.06] focus:bg-white/[0.06] focus:border-primary/40 outline-none text-sm"
              data-testid="archive-search"
            />
          </div>

          {searching ? (
            <div className="space-y-4">
              <h2 className="text-sm uppercase tracking-wider text-white/60">
                Search · {debouncedQuery}
              </h2>
              {search.isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <ContentCardSkeleton key={i} />
                  ))}
                </div>
              ) : (search.data?.items.length || 0) === 0 ? (
                <div className="py-20 text-center text-muted-foreground">
                  No archive titles match this query.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                  {search.data?.items.map((m) => (
                    <ContentCard key={m.id} content={archiveToContent(m)} />
                  ))}
                </div>
              )}
            </div>
          ) : curated.isLoading ? (
            <div className="space-y-12">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="h-5 w-48 bg-white/10 rounded animate-pulse" />
                  <div className="flex gap-4 overflow-hidden">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <div
                        key={j}
                        className="shrink-0 w-[180px]"
                      >
                        <ContentCardSkeleton />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-10">
              {curated.data?.rows.map((row) => (
                <CuratedRow
                  key={row.id}
                  rowId={row.id}
                  label={row.label}
                  description={row.description}
                  items={row.items}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
