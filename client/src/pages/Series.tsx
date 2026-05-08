import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ContentCard, ContentCardSkeleton } from "@/components/ContentCard";
import { Footer } from "@/components/Footer";
import { FilterBar, DEFAULT_FILTERS, decadeRange, type FilterState } from "@/components/FilterBar";
import { useDiscover } from "@/lib/api";
import { tmdbToContent } from "@/lib/tmdbAdapter";
import type { CatalogItem } from "@/lib/api";

export default function Series() {
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    sort: "popularity.desc",
  });
  const [page, setPage] = useState(1);
  const [allResults, setAllResults] = useState<CatalogItem[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const params = useMemo(() => {
    const range = filters.decade ? decadeRange(filters.decade) : {};
    return {
      kind: "tv",
      sort: filters.sort,
      genre: filters.genres.length > 0 ? filters.genres.join(",") : undefined,
      year: filters.decade ? undefined : filters.year || undefined,
      fromDate: range.from,
      toDate: range.to,
      lang: filters.language || undefined,
      country: filters.country || undefined,
      certification: filters.certification || undefined,
      keyword: filters.keywords.trim() || undefined,
      minRating: filters.minRating > 0 ? String(filters.minRating * 2) : undefined,
      page,
    };
  }, [filters, page]);

  const { data, isLoading, isFetching } = useDiscover(params);

  useEffect(() => {
    setPage(1);
    setAllResults([]);
  }, [filters]);

  useEffect(() => {
    if (!data?.results) return;
    setAllResults((prev) => {
      const ids = new Set(prev.map((p) => p.id));
      const next = [...prev];
      for (const r of data.results) if (!ids.has(r.id)) next.push(r);
      return next;
    });
  }, [data?.results, page]);

  useEffect(() => {
    if (!sentinelRef.current || !data || page >= data.totalPages) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetching) setPage((p) => p + 1);
      },
      { rootMargin: "600px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [data, page, isFetching]);

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
              Library
            </span>
            <h1
              className="font-display text-balance text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.95] tracking-[0.005em]"
              data-testid="text-page-title"
            >
              TV Shows
            </h1>
            <p className="text-muted-foreground max-w-xl">
              Binge-worthy series, weekly drops and award-winning originals across every genre.
            </p>
          </motion.div>

          <FilterBar kind="tv" value={filters} onChange={setFilters} />

          {isLoading && allResults.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
              {Array.from({ length: 18 }).map((_, i) => (
                <ContentCardSkeleton key={i} />
              ))}
            </div>
          ) : allResults.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              No series match these filters.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                {allResults.map((s) => (
                  <ContentCard key={s.id} content={tmdbToContent(s)} />
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
