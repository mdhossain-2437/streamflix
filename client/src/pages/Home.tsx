import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Info, Plus, VolumeX, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ContentRow } from "@/components/ContentRow";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  useTrending,
  usePopular,
  useTopRated,
  useUpcoming,
  useOnTheAir,
  useArchiveFeatured,
  useAiStatus,
  type CatalogItem,
} from "@/lib/api";
import { tmdbToContent, archiveToContent } from "@/lib/tmdbAdapter";
import { hybridRecommend } from "@/lib/recommend";
import type { Content, ViewingProgress } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: continueWatchingRaw = [] } = useQuery<ViewingProgress[]>({
    queryKey: ["/api/continue-watching"],
  });

  // Fetch all rows in parallel from the unified API.
  const { data: trendingData, isLoading: trendingLoading } = useTrending({ window: "week", kind: "all" });
  const { data: popularMoviesData, isLoading: moviesLoading } = usePopular({ kind: "movie" });
  const { data: popularSeriesData, isLoading: seriesLoading } = usePopular({ kind: "tv" });
  const { data: topMoviesData } = useTopRated({ kind: "movie" });
  const { data: topSeriesData } = useTopRated({ kind: "tv" });
  const { data: upcomingData } = useUpcoming();
  const { data: onTheAirData } = useOnTheAir();
  const { data: archiveData } = useArchiveFeatured({ limit: 18 });
  const { data: aiStatus } = useAiStatus();

  const trending: Content[] = (trendingData?.results || []).slice(0, 10).map(tmdbToContent);
  const movies: Content[] = (popularMoviesData?.results || []).slice(0, 20).map(tmdbToContent);
  const series: Content[] = (popularSeriesData?.results || []).slice(0, 20).map(tmdbToContent);
  const topMovies: Content[] = (topMoviesData?.results || []).slice(0, 20).map(tmdbToContent);
  const topSeries: Content[] = (topSeriesData?.results || []).slice(0, 20).map(tmdbToContent);
  const upcoming: Content[] = (upcomingData?.results || []).slice(0, 20).map(tmdbToContent);
  const onTheAir: Content[] = (onTheAirData?.results || []).slice(0, 20).map(tmdbToContent);

  const featuredContent: Content | undefined = trending[0];

  // Resolve viewing-progress records into Content cards using the trending
  // pool we already have in cache. (Detail fetches happen on click.)
  const allKnown: Content[] = [...trending, ...movies, ...series, ...topMovies, ...topSeries, ...upcoming, ...onTheAir];
  const knownById = new Map(allKnown.map((c) => [c.id, c]));
  const continueWatching: { content: Content; progress: ViewingProgress }[] = continueWatchingRaw
    .filter((p) => knownById.has(p.contentId))
    .map((p) => ({ content: knownById.get(p.contentId)!, progress: p }));

  const continueWatchingProgress = continueWatching.reduce(
    (acc, item) => {
      acc[item.content.id] = item.progress;
      return acc;
    },
    {} as Record<string, ViewingProgress>,
  );

  const freeContent: Content[] = (archiveData?.items || []).map(archiveToContent);

  // Build a hybrid recommendation row from continue-watching + popular pool.
  // Local genre/popularity rank runs immediately; AI re-ranking kicks in
  // asynchronously when Gemini/OpenAI is configured.
  const candidates: CatalogItem[] = useMemo(() => {
    const all = [
      ...(popularMoviesData?.results || []),
      ...(popularSeriesData?.results || []),
      ...(topMoviesData?.results || []),
      ...(topSeriesData?.results || []),
      ...(trendingData?.results || []),
    ];
    const seen = new Set<string>();
    return all.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
  }, [popularMoviesData, popularSeriesData, topMoviesData, topSeriesData, trendingData]);

  const historySeed = useMemo(
    () =>
      continueWatching.map((cw) => ({
        id: cw.content.id,
        title: cw.content.title,
        genres: (cw.content.genres as string[] | null) || undefined,
        year: cw.content.releaseYear ? String(cw.content.releaseYear) : undefined,
      })),
    [continueWatching],
  );

  const [forYou, setForYou] = useState<Content[]>([]);
  const [forYouReasons, setForYouReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    if (candidates.length === 0) return;
    let cancelled = false;
    hybridRecommend(candidates, historySeed, {
      limit: 18,
      useAi: !!aiStatus?.configured,
    }).then((ranked) => {
      if (cancelled) return;
      setForYou(ranked.map((r) => tmdbToContent(r.item)));
      const r: Record<string, string> = {};
      for (const x of ranked) {
        if (x.reason) r[x.item.id] = x.reason;
      }
      setForYouReasons(r);
    });
    return () => {
      cancelled = true;
    };
  }, [candidates, historySeed, aiStatus?.configured]);
  void forYouReasons;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="font-display text-4xl text-primary animate-glow-pulse">
            STREAM<span className="text-foreground">FLIX</span>
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-[0.3em]">
            Loading
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO BILLBOARD */}
      <section className="relative h-[92vh] min-h-[640px] noise overflow-hidden">
        {featuredContent?.backdropUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center animate-kenburns"
            style={{ backgroundImage: `url(${featuredContent.backdropUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-rose-900 via-background to-background" />
        )}

        {/* multi-layer scrims */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/0" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-b from-transparent via-background/60 to-background" />
        <div className="absolute inset-0 bg-radial-fade pointer-events-none" />

        {/* hero copy */}
        <div className="relative z-20 h-full flex items-end pb-20 md:pb-28 px-4 md:px-8 lg:px-16">
          {featuredContent && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl space-y-5"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] backdrop-blur-md px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-foreground/90">
                  {featuredContent.type === "series" ? "Series Spotlight" : "Featured Today"}
                </span>
              </span>

              <h1
                className="font-display text-balance text-[clamp(2.6rem,6.5vw,5rem)] leading-[0.95] tracking-[0.005em] drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]"
                data-testid="text-featured-title"
              >
                {featuredContent.title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-sm text-foreground/80">
                {featuredContent.imdbRating && (
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                    <span className="text-base leading-none">★</span>
                    {featuredContent.imdbRating}
                  </span>
                )}
                {featuredContent.releaseYear && (
                  <span>{featuredContent.releaseYear}</span>
                )}
                {featuredContent.duration && (
                  <span>{featuredContent.duration} min</span>
                )}
                {featuredContent.rating && (
                  <span className="border border-white/30 px-1.5 py-0.5 rounded text-xs font-medium">
                    {featuredContent.rating}
                  </span>
                )}
                {featuredContent.genres && featuredContent.genres.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {featuredContent.genres.slice(0, 3).map((g) => (
                      <span
                        key={g}
                        className="text-xs uppercase tracking-wider text-white/65"
                      >
                        · {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <p
                className="text-base md:text-lg text-white/85 line-clamp-3 max-w-xl text-balance leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]"
                data-testid="text-featured-description"
              >
                {featuredContent.description}
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link href={`/watch/${featuredContent.id}`}>
                  <Button
                    size="lg"
                    className="h-12 px-8 text-base bg-white text-black hover:bg-white/90 hover:scale-[1.02] transition-transform font-semibold"
                    data-testid="button-play-featured"
                  >
                    <Play className="w-5 h-5 mr-2 fill-black" />
                    Play
                  </Button>
                </Link>
                <Link href={`/${featuredContent.type}/${featuredContent.id}`}>
                  <Button
                    size="lg"
                    variant="secondary"
                    className="h-12 px-8 text-base bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/15 text-foreground"
                    data-testid="button-info-featured"
                  >
                    <Info className="w-5 h-5 mr-2" />
                    More Info
                  </Button>
                </Link>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-12 w-12 bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/15"
                  data-testid="button-add-featured"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* mute / age badge cluster */}
        <div className="hidden md:flex absolute right-0 bottom-28 items-center gap-3 z-20 pr-4 md:pr-8 lg:pr-16">
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-full border border-white/30 bg-black/30 hover:bg-black/50"
          >
            <VolumeX className="w-4 h-4" />
          </Button>
          {featuredContent?.rating && (
            <div className="bg-white/15 backdrop-blur-md border-l-4 border-white/80 px-4 py-1.5 text-sm font-semibold tracking-wide">
              {featuredContent.rating}
            </div>
          )}
        </div>
      </section>

      {/* ROWS */}
      <div className="relative z-10 -mt-12 md:-mt-16 space-y-10 md:space-y-14 pb-16">
        {continueWatching.length > 0 && (
          <ContentRow
            title="Continue Watching"
            subtitle="Pick up right where you left off"
            contents={continueWatching.map((item) => item.content)}
            progress={continueWatchingProgress}
          />
        )}

        <ContentRow
          title="Trending Now"
          contents={trending}
          variant="top10"
          isLoading={trendingLoading}
          skeletonCount={10}
        />

        {forYou.length > 0 && (
          <ContentRow
            title={aiStatus?.configured ? "Picked for You by AI" : "Recommended for You"}
            subtitle={
              aiStatus?.configured
                ? "Re-ranked by Gemini based on your watch history"
                : "Based on what's popular in your favorite genres"
            }
            contents={forYou}
          />
        )}

        {freeContent.length > 0 && (
          <ContentRow
            title="Free to Watch — Public Domain"
            subtitle="Classic films from the Internet Archive — no subscription, no DRM"
            contents={freeContent}
            seeAllLink="/free"
          />
        )}

        <ContentRow
          title="Popular Movies"
          subtitle="Hand-picked by our editors"
          contents={movies}
          seeAllLink="/movies"
          isLoading={moviesLoading}
        />

        <ContentRow
          title="Popular TV Shows"
          subtitle="Binge-worthy series, every week"
          contents={series}
          seeAllLink="/series"
          isLoading={seriesLoading}
        />

        {topMovies.length > 0 && (
          <ContentRow
            title="Top-Rated Cinema"
            subtitle="The all-time best, scored by audiences"
            contents={topMovies}
            seeAllLink="/movies"
          />
        )}

        {topSeries.length > 0 && (
          <ContentRow
            title="Critically Acclaimed Series"
            subtitle="The shows that became cultural moments"
            contents={topSeries}
            seeAllLink="/series"
          />
        )}

        {upcoming.length > 0 && (
          <ContentRow
            title="Coming Soon"
            subtitle="What’s about to drop in theaters"
            contents={upcoming}
            seeAllLink="/movies"
          />
        )}

        {onTheAir.length > 0 && (
          <ContentRow
            title="On the Air"
            subtitle="Live this week—new episodes arriving"
            contents={onTheAir}
            seeAllLink="/series"
          />
        )}
      </div>

      <Footer />
    </div>
  );
}
