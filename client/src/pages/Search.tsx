import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search as SearchIcon,
  X,
  Clock,
  TrendingUp,
  Film,
  Tv,
  SlidersHorizontal,
  User as UserIcon,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ContentCard, ContentCardSkeleton } from "@/components/ContentCard";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSearch as useApiSearch, useTrending, useAiStatus, aiSemanticSearch, useDiscover } from "@/lib/api";
import type { CatalogItem, PersonHit, SemanticSearchResult } from "@/lib/api";
import { Sparkles } from "lucide-react";
import { tmdbToContent } from "@/lib/tmdbAdapter";
import type { Content } from "@shared/schema";

const RECENT_SEARCHES_KEY = "streamflix-recent-searches";
const MAX_RECENT = 8;

function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const recent = getRecentSearches().filter((s) => s !== query);
  recent.unshift(query);
  localStorage.setItem(
    RECENT_SEARCHES_KEY,
    JSON.stringify(recent.slice(0, MAX_RECENT)),
  );
}

function removeRecentSearch(query: string) {
  const recent = getRecentSearches().filter((s) => s !== query);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

type ContentFilter = "all" | "movie" | "series" | "person";

export default function Search() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const initialQuery = params.get("q") || "";

  const [, setLocation] = useLocation();
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<ContentFilter>("all");
  const [recentSearches, setRecentSearches] = useState(getRecentSearches);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Update URL when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      setLocation(`/search?q=${encodeURIComponent(debouncedQuery)}`, {
        replace: true,
      });
    } else {
      setLocation("/search", { replace: true });
    }
  }, [debouncedQuery, setLocation]);

  // Save to recent when user submits or after a settled query
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      saveRecentSearch(debouncedQuery);
      setRecentSearches(getRecentSearches());
    }
  }, [debouncedQuery]);

  const apiKind = filter === "all" ? "multi" : filter === "person" ? "person" : filter === "series" ? "tv" : "movie";
  const { data: searchData, isLoading: searchLoading } = useApiSearch(
    debouncedQuery,
    apiKind,
  );

  const allHits = searchData?.results || [];
  const peopleHits: PersonHit[] = allHits.filter(
    (h): h is PersonHit => (h as PersonHit).type === "person",
  );
  const titleHits: CatalogItem[] = allHits.filter(
    (h): h is CatalogItem =>
      (h as CatalogItem).type === "movie" || (h as CatalogItem).type === "series",
  );
  const titleResults: Content[] = titleHits.map(tmdbToContent);

  const isSearching = debouncedQuery.length >= 2;
  const isLoading = isSearching && searchLoading;
  const hasResults = titleResults.length > 0 || peopleHits.length > 0;
  const mergedResults = titleResults; // legacy alias for the JSX below

  const { data: trendingData } = useTrending({ window: "week", kind: "all" });
  const trendingContent: Content[] = (trendingData?.results || [])
    .slice(0, 12)
    .map(tmdbToContent);

  const { data: aiStatus } = useAiStatus();
  const [aiResult, setAiResult] = useState<SemanticSearchResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const semanticParams = useMemo(() => {
    if (!aiResult) return null;
    const out: Record<string, string> = {
      kind: aiResult.kind === "tv" ? "tv" : "movie",
      sort: aiResult.sort ? `${aiResult.sort}.desc` : "popularity.desc",
    };
    if (aiResult.minRating !== undefined) {
      out.minRating = String(aiResult.minRating * 2);
    }
    if (aiResult.language) out.lang = aiResult.language;
    if (aiResult.yearFrom) {
      out.fromDate = `${aiResult.yearFrom}-01-01`;
    }
    if (aiResult.yearTo) {
      out.toDate = `${aiResult.yearTo}-12-31`;
    }
    return out;
  }, [aiResult]);

  const { data: semanticData } = useDiscover(semanticParams || {}, !!semanticParams);
  const semanticResults: Content[] = (semanticData?.results || []).map(tmdbToContent);

  const handleAiSearch = useCallback(async () => {
    if (!debouncedQuery.trim() || !aiStatus?.configured) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const r = await aiSemanticSearch(debouncedQuery);
      if (!r) setAiError("AI is unavailable right now.");
      else setAiResult(r);
    } catch (e) {
      setAiError(String(e));
    } finally {
      setAiLoading(false);
    }
  }, [debouncedQuery, aiStatus?.configured]);

  useEffect(() => {
    setAiResult(null);
    setAiError(null);
  }, [debouncedQuery]);

  const handleClear = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    inputRef.current?.focus();
  }, []);

  const handleRecentClick = useCallback((search: string) => {
    setQuery(search);
    setDebouncedQuery(search);
  }, []);

  const handleRemoveRecent = useCallback(
    (e: React.MouseEvent, search: string) => {
      e.stopPropagation();
      removeRecentSearch(search);
      setRecentSearches(getRecentSearches());
    },
    [],
  );

  const handleClearAll = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim().length >= 2) {
        setDebouncedQuery(query.trim());
        saveRecentSearch(query.trim());
        setRecentSearches(getRecentSearches());
      }
    },
    [query],
  );

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filterOptions: { value: ContentFilter; label: string; icon: typeof Film }[] = [
    { value: "all", label: "All", icon: SlidersHorizontal },
    { value: "movie", label: "Movies", icon: Film },
    { value: "series", label: "TV Shows", icon: Tv },
    { value: "person", label: "People", icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative pt-28 md:pt-32 px-4 md:px-8 lg:px-16 pb-16">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-radial-fade pointer-events-none" />

        <div className="relative space-y-8">
          {/* Search header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
                Explore
              </span>
              <h1
                className="font-display text-balance text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.95] tracking-[0.005em]"
                data-testid="text-page-title"
              >
                Search
              </h1>
            </div>

            {/* Search input */}
            <form onSubmit={handleSubmit} className="relative max-w-2xl">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search titles, people, genres..."
                className="h-14 pl-12 pr-12 text-lg bg-card/70 backdrop-blur-md border-white/10 focus-visible:ring-primary/50 rounded-xl"
                data-testid="input-search-page"
              />
              <AnimatePresence>
                {query && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-white/10"
                      onClick={handleClear}
                      data-testid="button-clear-search"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* AI semantic search trigger */}
            {aiStatus?.configured && isSearching && (
              <div className="flex items-center gap-3 max-w-2xl">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                  onClick={handleAiSearch}
                  disabled={aiLoading}
                  data-testid="ai-search"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  {aiLoading ? "Thinking…" : "Ask AI to find this"}
                </Button>
                {aiResult?.explanation && (
                  <p className="text-xs text-muted-foreground italic">
                    {aiResult.explanation}
                  </p>
                )}
                {aiError && (
                  <p className="text-xs text-rose-400">{aiError}</p>
                )}
              </div>
            )}

            {/* Type filters */}
            {isSearching && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex gap-2"
              >
                {filterOptions.map(({ value, label, icon: Icon }) => {
                  const active = filter === value;
                  return (
                    <Badge
                      key={value}
                      variant={active ? "default" : "outline"}
                      className={`cursor-pointer h-9 px-4 text-sm font-medium tracking-wide transition-all duration-200 flex items-center gap-2 ${
                        active
                          ? "bg-primary/90 text-primary-foreground border-primary shadow-glow-sm"
                          : "bg-white/[0.04] border-white/10 text-foreground/80 hover:bg-white/[0.08]"
                      }`}
                      onClick={() => setFilter(value)}
                      data-testid={`filter-${value}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </Badge>
                  );
                })}
              </motion.div>
            )}
          </motion.div>

          {/* Results or empty state */}
          <AnimatePresence mode="wait">
            {isSearching ? (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Results count */}
                {!isLoading && (
                  <p className="text-sm text-muted-foreground mb-6">
                    {hasResults
                      ? `${mergedResults.length} result${mergedResults.length !== 1 ? "s" : ""} for "${debouncedQuery}"`
                      : `No results for "${debouncedQuery}"`}
                  </p>
                )}

                {isLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <ContentCardSkeleton key={i} />
                    ))}
                  </div>
                ) : hasResults ? (
                  <div className="space-y-10">
                    {peopleHits.length > 0 && (
                      <section className="space-y-4">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/90">
                          People
                        </h2>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                          {peopleHits.slice(0, 16).map((p) => (
                            <button
                              key={p.id}
                              className="group text-center"
                              onClick={() => setLocation(`/person/${p.tmdbId}`)}
                              data-testid={`person-${p.tmdbId}`}
                            >
                              <div className="aspect-[2/3] rounded-md overflow-hidden bg-muted ring-1 ring-white/5 group-hover:ring-primary/50 transition-all">
                                {p.imageUrl ? (
                                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                                ) : (
                                  <div className="w-full h-full grid place-items-center">
                                    <UserIcon className="w-8 h-8 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <p className="text-xs mt-2 line-clamp-2 group-hover:text-primary transition-colors">
                                {p.name}
                              </p>
                            </button>
                          ))}
                        </div>
                      </section>
                    )}
                    {semanticResults.length > 0 && (
                      <section className="space-y-4">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-primary/90 flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5" />
                          AI Suggestions
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                          {semanticResults.slice(0, 12).map((item) => (
                            <ContentCard key={`ai-${item.id}`} content={item} />
                          ))}
                        </div>
                      </section>
                    )}
                    {mergedResults.length > 0 && (
                      <section className="space-y-4">
                        {(peopleHits.length > 0 || semanticResults.length > 0) && (
                          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/90">
                            Titles
                          </h2>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                          {mergedResults.map((item, i) => (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                duration: 0.45,
                                delay: Math.min(i * 0.02, 0.5),
                              }}
                            >
                              <ContentCard content={item} />
                            </motion.div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-20 space-y-4">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-card/80 ring-1 ring-white/10">
                      <SearchIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-xl font-semibold">No results found</p>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Try different keywords or check the spelling. You can also
                      browse by genre from the Movies or TV Shows page.
                    </p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-12"
              >
                {/* Recent searches */}
                {recentSearches.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-foreground/90">
                        <Clock className="w-4 h-4" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider">
                          Recent Searches
                        </h2>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={handleClearAll}
                        data-testid="button-clear-recent"
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((search) => (
                        <Badge
                          key={search}
                          variant="outline"
                          className="cursor-pointer h-9 pl-4 pr-2 text-sm bg-white/[0.04] border-white/10 text-foreground/80 hover:bg-white/[0.08] transition-all duration-200 flex items-center gap-2 group"
                          onClick={() => handleRecentClick(search)}
                          data-testid={`recent-${search}`}
                        >
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {search}
                          <button
                            className="ml-1 p-0.5 rounded-full hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleRemoveRecent(e, search)}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </section>
                )}

                {/* Trending */}
                {trendingContent.length > 0 && (
                  <section className="space-y-5">
                    <div className="flex items-center gap-2 text-foreground/90">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <h2 className="text-sm font-semibold uppercase tracking-wider">
                        Trending Now
                      </h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                      {trendingContent.map((item, i) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.45,
                            delay: Math.min(i * 0.03, 0.5),
                          }}
                        >
                          <ContentCard content={item} />
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Footer />
    </div>
  );
}
