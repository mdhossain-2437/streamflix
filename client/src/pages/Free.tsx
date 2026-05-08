// Free / public-domain movies — sourced from the Internet Archive.
// Real streamable URLs. No subscription. No DRM.
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContentCard, ContentCardSkeleton } from "@/components/ContentCard";
import { useArchiveFeatured, useArchiveSearch, type ArchiveItem } from "@/lib/api";
import { archiveToContent } from "@/lib/tmdbAdapter";

export default function Free() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [allResults, setAllResults] = useState<ArchiveItem[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
    setAllResults([]);
  }, [debouncedQuery]);

  const searching = debouncedQuery.trim().length >= 2;

  const featured = useArchiveFeatured({ limit: 36, page });
  const search = useArchiveSearch(debouncedQuery, { limit: 36, page });
  const data = searching ? search.data : featured.data;
  const isLoading = searching ? search.isLoading : featured.isLoading;
  const isFetching = searching ? search.isFetching : featured.isFetching;

  useEffect(() => {
    if (!data?.items) return;
    setAllResults((prev) => {
      const ids = new Set(prev.map((p) => p.id));
      const next = [...prev];
      for (const it of data.items) if (!ids.has(it.id)) next.push(it);
      return next;
    });
  }, [data?.items, page]);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    if (!data) return;
    const totalLoaded = allResults.length;
    if (totalLoaded >= (data.numFound ?? 0)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetching) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [data, allResults.length, isFetching]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative pt-32 md:pt-36 px-4 md:px-8 lg:px-16 pb-16">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-radial-fade pointer-events-none" />

        <div className="relative space-y-8">
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
              Classic films from the Internet Archive. Real streamable MP4 sources, no
              subscription, no DRM. Includes Charlie Chaplin, Buster Keaton, Hitchcock,
              Méliès, and the entire silent-era canon.
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

          {isLoading && allResults.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
              {Array.from({ length: 18 }).map((_, i) => (
                <ContentCardSkeleton key={i} />
              ))}
            </div>
          ) : allResults.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              {searching
                ? "No archive titles match this query."
                : "No featured titles loaded yet — try refreshing."}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                {allResults.map((m) => (
                  <ContentCard key={m.id} content={archiveToContent(m)} />
                ))}
              </div>
              <div ref={sentinelRef} className="h-12" />
              {isFetching && page > 1 && (
                <div className="text-center text-sm text-muted-foreground py-4">
                  Loading more…
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
