// "View all" page for a single curated archive row. Renders a paginated
// infinite-scroll grid of ContentCards, sourced from the same archive.org
// query as the row on /free.
import { useEffect, useRef, useState } from "react";
import { useRoute } from "wouter";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContentCard, ContentCardSkeleton } from "@/components/ContentCard";
import { useArchiveRow, type ArchiveItem } from "@/lib/api";
import { archiveToContent } from "@/lib/tmdbAdapter";

export default function FreeRow() {
  const [, params] = useRoute("/free/row/:id");
  const rowId = params?.id;
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [rowId]);

  const { data, isLoading, isFetching } = useArchiveRow(rowId, { limit: 36, page });

  useEffect(() => {
    if (!data?.items) return;
    setItems((prev) => {
      const ids = new Set(prev.map((p) => p.id));
      const next = [...prev];
      for (const it of data.items) if (!ids.has(it.id)) next.push(it);
      return next;
    });
  }, [data?.items, page]);

  useEffect(() => {
    if (!sentinelRef.current || !data) return;
    if (items.length >= (data.numFound ?? 0)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetching) setPage((p) => p + 1);
      },
      { rootMargin: "600px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [data, items.length, isFetching]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="relative pt-32 md:pt-36 px-4 md:px-8 lg:px-16 pb-16">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-radial-fade pointer-events-none" />
        <div className="relative space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-2"
          >
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
              Free · Public Domain
            </span>
            <h1 className="font-display text-balance text-[clamp(2rem,5vw,3.5rem)] leading-[1] tracking-[0.005em]">
              {data?.label ?? "Loading…"}
            </h1>
            {data?.description && (
              <p className="text-muted-foreground max-w-2xl">{data.description}</p>
            )}
          </motion.div>

          {isLoading && items.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
              {Array.from({ length: 18 }).map((_, i) => (
                <ContentCardSkeleton key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              No titles loaded for this row.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                {items.map((m) => (
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
