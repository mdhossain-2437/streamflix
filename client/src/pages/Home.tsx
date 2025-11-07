import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Info, Plus } from "lucide-react";
import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { ContentRow } from "@/components/ContentRow";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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

  const { data: featuredContent } = useQuery<Content>({
    queryKey: ["/api/content/featured"],
  });

  const { data: trending = [] } = useQuery<Content[]>({
    queryKey: ["/api/content/trending"],
  });

  const { data: continueWatching = [] } = useQuery<{ content: Content; progress: ViewingProgress }[]>({
    queryKey: ["/api/continue-watching"],
  });

  const { data: movies = [] } = useQuery<Content[]>({
    queryKey: ["/api/content", { type: "movie", limit: 20 }],
  });

  const { data: series = [] } = useQuery<Content[]>({
    queryKey: ["/api/content", { type: "series", limit: 20 }],
  });

  const continueWatchingProgress = continueWatching.reduce((acc, item) => {
    acc[item.content.id] = item.progress;
    return acc;
  }, {} as Record<string, ViewingProgress>);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative h-[70vh] md:h-[80vh]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background z-10" />
        
        {featuredContent?.backdropUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${featuredContent.backdropUrl})`,
            }}
          />
        )}

        <div className="relative z-20 h-full flex items-end pb-16 md:pb-24 px-4 md:px-8 lg:px-16">
          <div className="max-w-2xl space-y-4 md:space-y-6">
            {featuredContent && (
              <>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold" data-testid="text-featured-title">
                  {featuredContent.title}
                </h1>
                <p className="text-base md:text-lg line-clamp-3" data-testid="text-featured-description">
                  {featuredContent.description}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  {featuredContent.imdbRating && (
                    <span className="flex items-center gap-1">
                      ⭐ {featuredContent.imdbRating}
                    </span>
                  )}
                  {featuredContent.releaseYear && (
                    <span>{featuredContent.releaseYear}</span>
                  )}
                  {featuredContent.rating && (
                    <span className="border border-border px-2 py-0.5 rounded text-xs">
                      {featuredContent.rating}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 pt-2">
                  <Link href={`/watch/${featuredContent.id}`}>
                    <Button size="lg" className="text-base px-8" data-testid="button-play-featured">
                      <Play className="w-5 h-5 mr-2" />
                      Play
                    </Button>
                  </Link>
                  <Link href={`/${featuredContent.type}/${featuredContent.id}`}>
                    <Button
                      size="lg"
                      variant="secondary"
                      className="text-base px-8 backdrop-blur-md bg-secondary/80"
                      data-testid="button-info-featured"
                    >
                      <Info className="w-5 h-5 mr-2" />
                      More Info
                    </Button>
                  </Link>
                  <Button
                    size="lg"
                    variant="secondary"
                    className="backdrop-blur-md bg-secondary/80"
                    data-testid="button-add-featured"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8 md:space-y-12 pb-16">
        {continueWatching.length > 0 && (
          <ContentRow
            title="Continue Watching"
            contents={continueWatching.map(item => item.content)}
            progress={continueWatchingProgress}
          />
        )}
        
        {trending.length > 0 && (
          <ContentRow
            title="Trending Now"
            contents={trending}
          />
        )}

        {movies.length > 0 && (
          <ContentRow
            title="Popular Movies"
            contents={movies}
            seeAllLink="/movies"
          />
        )}

        {series.length > 0 && (
          <ContentRow
            title="Popular TV Shows"
            contents={series}
            seeAllLink="/series"
          />
        )}
      </div>
    </div>
  );
}
