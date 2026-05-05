import { useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Play, Plus, Check, ChevronLeft, ThumbsUp, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ContentCard } from "@/components/ContentCard";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Content, Episode } from "@shared/schema";

export default function ContentDetail() {
  const [, params] = useRoute("/:type/:id");
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

  const { data: content } = useQuery<Content>({
    queryKey: [`/api/content/${params?.id}`],
    enabled: !!params?.id,
  });

  const { data: episodes = [] } = useQuery<Episode[]>({
    queryKey: [`/api/episodes/${params?.id}`],
    enabled: !!params?.id && content?.type === "series",
  });

  const { data: similar = [] } = useQuery<Content[]>({
    queryKey: [`/api/content/similar/${params?.id}`],
    enabled: !!params?.id,
  });

  const { data: isInWatchlist = false } = useQuery<boolean>({
    queryKey: [`/api/watchlist/check/${params?.id}`],
    enabled: !!params?.id && isAuthenticated,
    retry: false,
  });

  const watchlistMutation = useMutation({
    mutationFn: async (action: "add" | "remove") => {
      if (action === "add") {
        return apiRequest("POST", "/api/watchlist", { contentId: params?.id });
      } else {
        return apiRequest("DELETE", `/api/watchlist/${params?.id}`, {});
      }
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/watchlist/check/${params?.id}`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: action === "remove" ? "Removed from watchlist" : "Added to watchlist",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to update watchlist",
        variant: "destructive",
      });
    },
  });

  const seasons = episodes
    .reduce((acc, ep) => {
      if (!acc.includes(ep.seasonNumber)) acc.push(ep.seasonNumber);
      return acc;
    }, [] as number[])
    .sort((a, b) => a - b);

  if (!content) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 flex items-center justify-center">
          <div className="font-display text-4xl text-primary animate-glow-pulse">
            STREAM<span className="text-foreground">FLIX</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO */}
      <section className="relative noise">
        {content.backdropUrl && (
          <div
            className="absolute inset-x-0 top-0 h-[640px] bg-cover bg-center animate-kenburns"
            style={{ backgroundImage: `url(${content.backdropUrl})` }}
          />
        )}
        <div className="absolute inset-x-0 top-0 h-[640px] bg-gradient-to-r from-background via-background/80 to-background/30" />
        <div className="absolute inset-x-0 top-0 h-[640px] bg-gradient-to-b from-background/80 via-background/30 to-background" />

        <div className="relative z-10 pt-24 md:pt-28 pb-12 px-4 md:px-8 lg:px-16">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="mb-6 hover:bg-white/5"
              data-testid="button-back"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="grid md:grid-cols-[280px,1fr] gap-8 md:gap-12 items-start"
          >
            <div className="aspect-[2/3] rounded-xl overflow-hidden bg-muted shadow-cinematic ring-1 ring-white/10 max-w-[300px]">
              {content.thumbnailUrl ? (
                <img
                  src={content.thumbnailUrl}
                  alt={content.title}
                  className="w-full h-full object-cover"
                  data-testid="img-poster"
                />
              ) : (
                <div className="w-full h-full grid place-items-center">
                  <Play className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                  <span className="h-px w-6 bg-primary" />
                  {content.type === "series" ? "Series" : "Feature Film"}
                </span>
                <h1
                  className="font-display text-balance text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.95] tracking-[0.005em]"
                  data-testid="text-content-title"
                >
                  {content.title}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-foreground/80">
                {content.imdbRating && (
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                    <span className="text-base leading-none">★</span>
                    {content.imdbRating}
                  </span>
                )}
                {content.releaseYear && (
                  <span data-testid="text-year">{content.releaseYear}</span>
                )}
                {content.duration && <span>{content.duration} min</span>}
                {content.rating && (
                  <span className="border border-white/30 px-1.5 py-0.5 rounded text-xs font-medium">
                    {content.rating}
                  </span>
                )}
              </div>

              {content.genres && content.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {content.genres.map((genre) => (
                    <Badge
                      key={genre}
                      variant="secondary"
                      className="bg-white/[0.07] text-white/85 border border-white/10 hover:bg-white/[0.12]"
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>
              )}

              <p
                className="text-base md:text-lg leading-relaxed text-white/85 max-w-3xl text-balance"
                data-testid="text-description"
              >
                {content.description}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link href={`/watch/${content.id}`}>
                  <Button
                    size="lg"
                    className="h-12 px-8 text-base bg-white text-black hover:bg-white/90 hover:scale-[1.02] transition-transform font-semibold"
                    data-testid="button-play"
                  >
                    <Play className="w-5 h-5 mr-2 fill-black" />
                    Play
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-12 px-6 text-base bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md"
                  onClick={() =>
                    watchlistMutation.mutate(isInWatchlist ? "remove" : "add")
                  }
                  disabled={watchlistMutation.isPending}
                  data-testid="button-watchlist"
                >
                  {isInWatchlist ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      In My List
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Add to List
                    </>
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-12 w-12 rounded-full border border-white/20 bg-white/5 hover:bg-white/15"
                  aria-label="Like"
                >
                  <ThumbsUp className="w-5 h-5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-12 w-12 rounded-full border border-white/20 bg-white/5 hover:bg-white/15"
                  aria-label="Share"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* TABS */}
      <div className="px-4 md:px-8 lg:px-16 pb-20">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-white/[0.04] border border-white/[0.06] p-1">
            <TabsTrigger
              value="overview"
              data-testid="tab-overview"
              className="data-[state=active]:bg-white/10 data-[state=active]:text-foreground"
            >
              Overview
            </TabsTrigger>
            {content.type === "series" && (
              <TabsTrigger
                value="episodes"
                data-testid="tab-episodes"
                className="data-[state=active]:bg-white/10 data-[state=active]:text-foreground"
              >
                Episodes
              </TabsTrigger>
            )}
            <TabsTrigger
              value="similar"
              data-testid="tab-similar"
              className="data-[state=active]:bg-white/10 data-[state=active]:text-foreground"
            >
              More Like This
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-10 mt-8">
            {content.cast && content.cast.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg md:text-xl font-semibold tracking-tight">
                  Cast & Crew
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  {content.cast.map((member, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.04 }}
                      className="space-y-2 group"
                      data-testid={`cast-member-${index}`}
                    >
                      <div className="relative">
                        <Avatar className="w-full aspect-square ring-2 ring-white/5 group-hover:ring-primary/60 transition-shadow duration-300">
                          <AvatarImage src={member.imageUrl} className="object-cover" />
                          <AvatarFallback className="text-xl bg-gradient-to-br from-primary/30 to-rose-700/30">
                            {member.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium leading-tight line-clamp-2">
                          {member.name}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {member.role}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {content.type === "series" && (
            <TabsContent value="episodes" className="mt-8">
              <Tabs defaultValue={`season-${seasons[0]}`}>
                <TabsList className="bg-white/[0.04] border border-white/[0.06] p-1">
                  {seasons.map((season) => (
                    <TabsTrigger
                      key={season}
                      value={`season-${season}`}
                      data-testid={`tab-season-${season}`}
                      className="data-[state=active]:bg-white/10"
                    >
                      Season {season}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {seasons.map((season) => (
                  <TabsContent
                    key={season}
                    value={`season-${season}`}
                    className="space-y-3 mt-6"
                  >
                    {episodes
                      .filter((ep) => ep.seasonNumber === season)
                      .sort((a, b) => a.episodeNumber - b.episodeNumber)
                      .map((episode) => (
                        <div
                          key={episode.id}
                          className="grid md:grid-cols-[280px,1fr] gap-4 p-3 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/[0.03] cursor-pointer transition-colors duration-200 group"
                          data-testid={`episode-${episode.id}`}
                        >
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                            {episode.thumbnailUrl ? (
                              <img
                                src={episode.thumbnailUrl}
                                alt={episode.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full grid place-items-center">
                                <Play className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center">
                              <div className="w-12 h-12 rounded-full bg-white/95 grid place-items-center">
                                <Play className="w-5 h-5 text-black fill-black" />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2 py-1">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="font-semibold text-base">
                                <span className="text-muted-foreground mr-2">
                                  {episode.episodeNumber}.
                                </span>
                                {episode.title}
                              </h3>
                              {episode.duration && (
                                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                                  {episode.duration} min
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                              {episode.description}
                            </p>
                          </div>
                        </div>
                      ))}
                  </TabsContent>
                ))}
              </Tabs>
            </TabsContent>
          )}

          <TabsContent value="similar" className="mt-8">
            {similar.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                {similar.map((item) => (
                  <ContentCard key={item.id} content={item} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-12">
                No similar content found
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
