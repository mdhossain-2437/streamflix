import { useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Play, Plus, Check, ChevronLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ContentCard } from "@/components/ContentCard";
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
      queryClient.invalidateQueries({ queryKey: [`/api/watchlist/check/${params?.id}`] });
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

  const seasons = episodes.reduce((acc, ep) => {
    if (!acc.includes(ep.seasonNumber)) {
      acc.push(ep.seasonNumber);
    }
    return acc;
  }, [] as number[]).sort((a, b) => a - b);

  if (!content) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background z-10" />
        
        {content.backdropUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center blur-sm"
            style={{
              backgroundImage: `url(${content.backdropUrl})`,
              height: "600px",
            }}
          />
        )}

        <div className="relative z-20 pt-24 md:pt-28 pb-16 px-4 md:px-8 lg:px-16">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>

          <div className="grid md:grid-cols-[300px,1fr] gap-8">
            <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted">
              {content.thumbnailUrl ? (
                <img
                  src={content.thumbnailUrl}
                  alt={content.title}
                  className="w-full h-full object-cover"
                  data-testid="img-poster"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="text-content-title">
                  {content.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
                  {content.imdbRating && (
                    <span className="flex items-center gap-1 text-base">
                      ⭐ {content.imdbRating}
                    </span>
                  )}
                  {content.releaseYear && (
                    <span data-testid="text-year">{content.releaseYear}</span>
                  )}
                  {content.rating && (
                    <Badge variant="outline">{content.rating}</Badge>
                  )}
                  {content.duration && (
                    <span>{content.duration} min</span>
                  )}
                </div>

                {content.genres && content.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {content.genres.map((genre) => (
                      <Badge key={genre} variant="secondary">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                )}

                <p className="text-lg leading-relaxed mb-6" data-testid="text-description">
                  {content.description}
                </p>

                <div className="flex flex-wrap gap-4">
                  <Link href={`/watch/${content.id}`}>
                    <Button size="lg" data-testid="button-play">
                      <Play className="w-5 h-5 mr-2" />
                      Play
                    </Button>
                  </Link>
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() => watchlistMutation.mutate(isInWatchlist ? "remove" : "add")}
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 lg:px-16 pb-16">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            {content.type === "series" && (
              <TabsTrigger value="episodes" data-testid="tab-episodes">Episodes</TabsTrigger>
            )}
            <TabsTrigger value="similar" data-testid="tab-similar">Similar</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {content.cast && content.cast.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">Cast</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {content.cast.map((member, index) => (
                    <div key={index} className="space-y-2" data-testid={`cast-member-${index}`}>
                      <Avatar className="w-full aspect-square">
                        <AvatarImage src={member.imageUrl} className="object-cover" />
                        <AvatarFallback className="text-lg">
                          {member.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-sm">
                        <p className="font-medium">{member.name}</p>
                        <p className="text-muted-foreground text-xs">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {content.type === "series" && (
            <TabsContent value="episodes" className="mt-6">
              <Tabs defaultValue={`season-${seasons[0]}`}>
                <TabsList>
                  {seasons.map((season) => (
                    <TabsTrigger
                      key={season}
                      value={`season-${season}`}
                      data-testid={`tab-season-${season}`}
                    >
                      Season {season}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {seasons.map((season) => (
                  <TabsContent key={season} value={`season-${season}`} className="space-y-4 mt-6">
                    {episodes
                      .filter((ep) => ep.seasonNumber === season)
                      .sort((a, b) => a.episodeNumber - b.episodeNumber)
                      .map((episode) => (
                        <div
                          key={episode.id}
                          className="grid md:grid-cols-[200px,1fr] gap-4 p-4 rounded-lg hover-elevate active-elevate-2 cursor-pointer"
                          data-testid={`episode-${episode.id}`}
                        >
                          <div className="aspect-video rounded-md overflow-hidden bg-muted">
                            {episode.thumbnailUrl ? (
                              <img
                                src={episode.thumbnailUrl}
                                alt={episode.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Play className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <h3 className="font-semibold">
                                {episode.episodeNumber}. {episode.title}
                              </h3>
                              {episode.duration && (
                                <span className="text-sm text-muted-foreground">
                                  {episode.duration} min
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
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

          <TabsContent value="similar" className="mt-6">
            {similar.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {similar.map((item) => (
                  <ContentCard key={item.id} content={item} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No similar content found</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
