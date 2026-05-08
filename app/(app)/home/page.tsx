"use client";

import { useQuery } from "@tanstack/react-query";
import { Play, Info, Plus, VolumeX, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ContentRow } from "@/components/ContentRow";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  useTmdbTrending,
  useTmdbPopular,
  useTmdbTopRated,
} from "@/lib/tmdb";
import { tmdbToContent } from "@/lib/tmdbAdapter";
import type { Content, ViewingProgress } from "@shared/schema";

export default function HomePage() {
  const { data: featuredContent } = useQuery<Content>({
    queryKey: ["/api/content/featured"],
  });

  const { data: localTrending = [], isLoading: localTrendingLoading } =
    useQuery<Content[]>({
      queryKey: ["/api/content/trending"],
    });

  const { data: continueWatching = [] } = useQuery<
    { content: Content; progress: ViewingProgress }[]
  >({
    queryKey: ["/api/continue-watching"],
  });

  const { data: localMovies = [], isLoading: localMoviesLoading } =
    useQuery<Content[]>({
      queryKey: ["/api/content", { type: "movie", limit: 20 }],
    });

  const { data: localSeries = [], isLoading: localSeriesLoading } =
    useQuery<Content[]>({
      queryKey: ["/api/content", { type: "series", limit: 20 }],
    });

  const { data: tmdbTrending } = useTmdbTrending("week", "all");
  const { data: tmdbMovies } = useTmdbPopular("movie");
  const { data: tmdbSeries } = useTmdbPopular("tv");
  const { data: tmdbTopMovies } = useTmdbTopRated("movie");

  const trending: Content[] =
    tmdbTrending && tmdbTrending.length > 0
      ? tmdbTrending.slice(0, 10).map(tmdbToContent)
      : localTrending;
  const movies: Content[] =
    tmdbMovies && tmdbMovies.length > 0
      ? tmdbMovies.slice(0, 18).map(tmdbToContent)
      : localMovies;
  const series: Content[] =
    tmdbSeries && tmdbSeries.length > 0
      ? tmdbSeries.slice(0, 18).map(tmdbToContent)
      : localSeries;
  const topMovies: Content[] =
    tmdbTopMovies && tmdbTopMovies.length > 0
      ? tmdbTopMovies.slice(0, 18).map(tmdbToContent)
      : [];

  const trendingLoading = localTrendingLoading && !tmdbTrending;
  const moviesLoading = localMoviesLoading && !tmdbMovies;
  const seriesLoading = localSeriesLoading && !tmdbSeries;

  const continueWatchingProgress = continueWatching.reduce(
    (acc, item) => {
      acc[item.content.id] = item.progress;
      return acc;
    },
    {} as Record<string, ViewingProgress>,
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative h-[92vh] min-h-[640px] noise overflow-hidden">
        {featuredContent?.backdropUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center animate-kenburns"
            style={{ backgroundImage: `url(${featuredContent.backdropUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-rose-900 via-background to-background" />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/0" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-b from-transparent via-background/60 to-background" />
        <div className="absolute inset-0 bg-radial-fade pointer-events-none" />

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
                  {featuredContent.type === "series"
                    ? "Series Spotlight"
                    : "Featured Today"}
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
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-8 text-base bg-white text-black hover:bg-white/90 hover:scale-[1.02] transition-transform font-semibold"
                  data-testid="button-play-featured"
                >
                  <Link href={`/watch/${featuredContent.id}`}>
                    <Play className="w-5 h-5 mr-2 fill-black" />
                    Play
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="h-12 px-8 text-base bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/15 text-foreground"
                  data-testid="button-info-featured"
                >
                  <Link href={`/${featuredContent.type}/${featuredContent.id}`}>
                    <Info className="w-5 h-5 mr-2" />
                    More Info
                  </Link>
                </Button>
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
      </div>

      <Footer />
    </div>
  );
}
