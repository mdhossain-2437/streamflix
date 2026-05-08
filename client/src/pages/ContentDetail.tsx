import { useEffect, useMemo, useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Play, Plus, Check, ChevronLeft, ThumbsUp, Share2, Star, Clock, Award,
  Globe, Languages, DollarSign, Download,
} from "lucide-react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ContentCard } from "@/components/ContentCard";
import { Footer } from "@/components/Footer";
import { AiInsightPanel } from "@/components/AiInsightPanel";
import { DownloadDialog } from "@/components/DownloadDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  parseCatalogId, useContentDetail, useSeason, formatRuntime,
} from "@/lib/api";
import { tmdbToContent } from "@/lib/tmdbAdapter";

function fmtMoney(n: number | null | undefined): string {
  if (!n || n <= 0) return "";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

export default function ContentDetail() {
  const [, params] = useRoute("/:type/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const parsed = parseCatalogId(params?.id);
  const { data: content, isLoading: contentLoading } = useContentDetail(
    parsed?.type,
    parsed?.tmdbId,
  );

  const [seasonIdx, setSeasonIdx] = useState<number>(1);
  const [downloadOpen, setDownloadOpen] = useState(false);
  useEffect(() => {
    if (content?.type === "series" && content.seasonsList && content.seasonsList.length > 0) {
      // Default to season 1 if it exists, otherwise the first numbered season.
      const firstReal = content.seasonsList.find((s) => s.number > 0) || content.seasonsList[0];
      setSeasonIdx(firstReal.number);
    }
  }, [content?.id, content?.type, content?.seasons]);

  const { data: seasonDetail } = useSeason(
    content?.type === "series" ? parsed?.tmdbId : undefined,
    content?.type === "series" ? seasonIdx : undefined,
  );

  const { data: isInWatchlist = false } = useQuery<boolean>({
    queryKey: [`/api/watchlist/check/${params?.id}`],
    enabled: !!params?.id,
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
    onMutate: () => {
      if (!isAuthenticated) {
        // optimistic — let it work for guests too via our local watchlist endpoint
      }
    },
  });

  // Top 4 crew: director(s) + writer(s).
  const topCrew = useMemo(() => {
    if (!content) return [];
    const wanted = ["Director", "Screenplay", "Writer", "Story"];
    return content.crew
      .filter((c) => wanted.includes(c.job))
      .slice(0, 6);
  }, [content]);

  if (!parsed) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 px-4 text-center">
          <p className="text-muted-foreground">Unknown content id.</p>
        </div>
      </div>
    );
  }

  if (contentLoading || !content) {
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

  const trailerUrl = content.trailer
    ? `https://www.youtube-nocookie.com/embed/${content.trailer.key}?modestbranding=1&rel=0`
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO */}
      <section className="relative noise overflow-hidden min-h-[640px]">
        {content.backdropUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center animate-kenburns"
            style={{ backgroundImage: `url(${content.backdropUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/30 to-background" />

        <div className="relative z-10 pt-24 md:pt-28 pb-12 px-4 md:px-8 lg:px-16">
          <Button
            variant="ghost"
            size="sm"
            className="mb-6 hover:bg-white/5"
            onClick={() => window.history.back()}
            data-testid="button-back"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="grid md:grid-cols-[280px,1fr] gap-8 md:gap-12 items-start"
          >
            <div className="aspect-[2/3] rounded-xl overflow-hidden bg-muted shadow-cinematic ring-1 ring-white/10 max-w-[300px]">
              {content.posterUrl ? (
                <img
                  src={content.posterUrl}
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
              <div className="space-y-2">
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
                {content.tagline && (
                  <p className="text-lg italic text-muted-foreground">
                    {content.tagline}
                  </p>
                )}
              </div>

              {/* Ratings strip — TMDB / IMDb / Rotten Tomatoes / Metacritic */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {content.voteAverage && content.voteAverage > 0 && (
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{content.voteAverage.toFixed(1)}</span>
                    <span className="text-muted-foreground">TMDB</span>
                  </div>
                )}
                {content.omdb?.imdbRating && (
                  <div className="flex items-center gap-1.5 font-semibold text-yellow-300">
                    <span className="bg-yellow-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide">
                      IMDb
                    </span>
                    <span>{content.omdb.imdbRating}</span>
                  </div>
                )}
                {content.omdb?.rottenTomatoes !== null && content.omdb?.rottenTomatoes !== undefined && (
                  <div className="flex items-center gap-1.5 font-semibold text-orange-400">
                    <span>🍅</span>
                    <span>{content.omdb.rottenTomatoes}%</span>
                  </div>
                )}
                {content.omdb?.metascore && (
                  <div className="flex items-center gap-1.5 font-semibold">
                    <span className="bg-emerald-700 text-white px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide">
                      MC
                    </span>
                    <span>{content.omdb.metascore}</span>
                  </div>
                )}
                {content.year && <span className="text-foreground/80">{content.year}</span>}
                {content.durationMin && (
                  <span className="text-foreground/80 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatRuntime(content.durationMin)}
                  </span>
                )}
                {content.omdb?.rated && (
                  <span className="border border-white/30 px-1.5 py-0.5 rounded text-xs font-medium">
                    {content.omdb.rated}
                  </span>
                )}
              </div>

              {content.genres && content.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {content.genres.map((genre) => (
                    <Link
                      key={genre}
                      href={`/${content.type === "series" ? "series" : "movies"}?genre=${encodeURIComponent(genre)}`}
                    >
                      <Badge
                        variant="secondary"
                        className="bg-white/[0.07] text-white/85 border border-white/10 hover:bg-white/[0.15] cursor-pointer"
                      >
                        {genre}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}

              <p
                className="text-base md:text-lg leading-relaxed text-white/85 max-w-3xl text-balance"
                data-testid="text-description"
              >
                {content.description || "No synopsis available."}
              </p>

              {(content.director || topCrew.length > 0) && (
                <div className="grid sm:grid-cols-2 gap-3 max-w-2xl text-sm">
                  {content.director && (
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Directed by
                      </span>
                      <div className="text-foreground/90 mt-0.5">{content.director}</div>
                    </div>
                  )}
                  {content.omdb?.writer && (
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Written by
                      </span>
                      <div className="text-foreground/90 mt-0.5 line-clamp-2">{content.omdb.writer}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link href={`/watch/${params?.id}`}>
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
                  aria-label="Download"
                  onClick={() => setDownloadOpen(true)}
                  data-testid="button-download"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-12 w-12 rounded-full border border-white/20 bg-white/5 hover:bg-white/15"
                  aria-label="Share"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: content.title,
                        url: window.location.href,
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      toast({ title: "Link copied" });
                    }
                  }}
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CONTENT TABS */}
      <div className="px-4 md:px-8 lg:px-16 pb-20">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-white/[0.05] border border-white/10 p-1 h-11 backdrop-blur-md flex-wrap">
            <TabsTrigger value="overview" className="text-sm px-5 h-9">Overview</TabsTrigger>
            {content.cast.length > 0 && <TabsTrigger value="cast" className="text-sm px-5 h-9">Cast</TabsTrigger>}
            {trailerUrl && <TabsTrigger value="trailer" className="text-sm px-5 h-9">Trailer</TabsTrigger>}
            {content.type === "series" && content.seasonsList && content.seasonsList.length > 0 && (
              <TabsTrigger value="episodes" className="text-sm px-5 h-9">Episodes</TabsTrigger>
            )}
            <TabsTrigger value="more" className="text-sm px-5 h-9">More Like This</TabsTrigger>
            <TabsTrigger value="details" className="text-sm px-5 h-9">Details</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-10 mt-8">
            <AiInsightPanel
              title={content.title}
              type={content.type}
              year={content.year}
              overview={content.description}
              genres={content.genres}
            />

            {content.cast.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg md:text-xl font-semibold tracking-tight">Top Cast</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  {content.cast.slice(0, 12).map((member) => (
                    <button
                      key={member.id}
                      onClick={() => setLocation(`/person/${member.id}`)}
                      className="space-y-2 group text-left"
                      data-testid={`cast-${member.id}`}
                    >
                      <Avatar className="w-full aspect-square ring-2 ring-white/5 group-hover:ring-primary/60 transition-shadow duration-300">
                        <AvatarImage src={member.imageUrl ?? undefined} className="object-cover" />
                        <AvatarFallback className="text-xl bg-gradient-to-br from-primary/30 to-rose-700/30">
                          {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-center">
                        <p className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                          {member.name}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {member.character}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {content.recommendations.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg md:text-xl font-semibold tracking-tight">Recommended for You</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5">
                  {content.recommendations.slice(0, 12).map((r) => (
                    <ContentCard key={r.id} content={tmdbToContent(r)} />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Cast tab */}
          {content.cast.length > 0 && (
            <TabsContent value="cast" className="mt-8 space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5">
                {content.cast.map((m) => (
                  <button
                    key={m.id}
                    className="group text-center"
                    onClick={() => setLocation(`/person/${m.id}`)}
                  >
                    <Avatar className="w-full aspect-square ring-2 ring-white/5 group-hover:ring-primary/60 transition-shadow">
                      <AvatarImage src={m.imageUrl ?? undefined} className="object-cover" />
                      <AvatarFallback>
                        {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium mt-2 line-clamp-2 group-hover:text-primary transition-colors">{m.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{m.character}</p>
                  </button>
                ))}
              </div>

              {content.crew.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Key Crew</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {content.crew.slice(0, 16).map((c, i) => (
                      <div key={`${c.id}-${c.job}-${i}`} className="text-sm">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.job}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          )}

          {/* Trailer tab */}
          {trailerUrl && (
            <TabsContent value="trailer" className="mt-8">
              <div className="aspect-video w-full max-w-4xl mx-auto rounded-xl overflow-hidden bg-black">
                <iframe
                  src={trailerUrl}
                  title={content.trailer?.name || "Trailer"}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              {content.videos.length > 1 && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">More Videos</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {content.videos.slice(0, 6).map((v) => (
                      <a
                        key={v.id}
                        href={`https://www.youtube.com/watch?v=${v.key}`}
                        target="_blank"
                        rel="noreferrer"
                        className="group"
                      >
                        <div className="aspect-video rounded-md overflow-hidden bg-muted">
                          <img
                            src={`https://img.youtube.com/vi/${v.key}/mqdefault.jpg`}
                            alt={v.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                        </div>
                        <p className="text-xs mt-2 line-clamp-2">{v.name}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          )}

          {/* Episodes tab */}
          {content.type === "series" && content.seasonsList && content.seasonsList.length > 0 && (
            <TabsContent value="episodes" className="mt-8 space-y-6">
              <div className="flex items-center gap-3">
                <Select
                  value={String(seasonIdx)}
                  onValueChange={(v) => setSeasonIdx(Number(v))}
                >
                  <SelectTrigger className="w-52 bg-white/[0.05] border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {content.seasonsList
                      .filter((s) => s.number > 0)
                      .map((s) => (
                        <SelectItem key={s.id} value={String(s.number)}>
                          Season {s.number} {s.episodeCount ? `(${s.episodeCount} episodes)` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {seasonDetail ? (
                <div className="space-y-3">
                  {seasonDetail.episodes.map((ep) => (
                    <div
                      key={ep.id}
                      className="grid md:grid-cols-[280px,1fr] gap-4 p-3 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/[0.03] cursor-pointer transition-colors duration-200 group"
                      data-testid={`episode-${ep.id}`}
                    >
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                        {ep.stillUrl ? (
                          <img
                            src={ep.stillUrl}
                            alt={ep.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
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
                            <span className="text-muted-foreground mr-2">{ep.episodeNumber}.</span>
                            {ep.name}
                          </h3>
                          <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground tabular-nums">
                            {ep.runtime && <span>{ep.runtime} min</span>}
                            {ep.rating && (
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                {ep.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {ep.overview || "No synopsis available."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Loading season…</p>
              )}
            </TabsContent>
          )}

          {/* More like this */}
          <TabsContent value="more" className="mt-8 space-y-8">
            {content.similar.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg md:text-xl font-semibold tracking-tight">Similar Titles</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                  {content.similar.map((item) => (
                    <ContentCard key={item.id} content={tmdbToContent(item)} />
                  ))}
                </div>
              </div>
            )}
            {content.recommendations.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg md:text-xl font-semibold tracking-tight">You Might Also Like</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                  {content.recommendations.map((item) => (
                    <ContentCard key={item.id} content={tmdbToContent(item)} />
                  ))}
                </div>
              </div>
            )}
            {content.similar.length === 0 && content.recommendations.length === 0 && (
              <p className="text-muted-foreground text-center py-12">No similar content found.</p>
            )}
          </TabsContent>

          {/* Details */}
          <TabsContent value="details" className="mt-8">
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl text-sm">
              {content.status && (
                <DetailRow label="Status" value={content.status} />
              )}
              {content.omdb?.released && (
                <DetailRow label="Released" value={content.omdb.released} />
              )}
              {content.budget && content.budget > 0 && (
                <DetailRow label="Budget" value={fmtMoney(content.budget)} icon={<DollarSign className="w-4 h-4" />} />
              )}
              {content.revenue && content.revenue > 0 && (
                <DetailRow label="Box Office" value={fmtMoney(content.revenue)} icon={<DollarSign className="w-4 h-4" />} />
              )}
              {content.omdb?.boxOffice && !content.revenue && (
                <DetailRow label="Box Office" value={content.omdb.boxOffice} icon={<DollarSign className="w-4 h-4" />} />
              )}
              {content.omdb?.awards && (
                <DetailRow label="Awards" value={content.omdb.awards} icon={<Award className="w-4 h-4" />} />
              )}
              {content.spokenLanguages.length > 0 && (
                <DetailRow
                  label="Languages"
                  value={content.spokenLanguages.map((l) => l.english_name).join(", ")}
                  icon={<Languages className="w-4 h-4" />}
                />
              )}
              {content.countries.length > 0 && (
                <DetailRow
                  label="Countries"
                  value={content.countries.map((c) => c.name).join(", ")}
                  icon={<Globe className="w-4 h-4" />}
                />
              )}
              {content.production.length > 0 && (
                <DetailRow
                  label="Production"
                  value={content.production.map((p) => p.name).join(", ")}
                />
              )}
              {content.networks && content.networks.length > 0 && (
                <DetailRow
                  label="Network"
                  value={content.networks.map((n) => n.name).join(", ")}
                />
              )}
              {content.keywords.length > 0 && (
                <div className="md:col-span-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Keywords</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {content.keywords.slice(0, 24).map((k) => (
                      <Badge key={k.id} variant="outline" className="text-xs bg-white/[0.04] border-white/10">
                        {k.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {content.watchProviders &&
                (content.watchProviders.stream.length > 0 ||
                  content.watchProviders.rent.length > 0 ||
                  content.watchProviders.buy.length > 0) && (
                  <div className="md:col-span-2 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Where to Watch</span>
                    <div className="space-y-3">
                      {(["stream", "rent", "buy"] as const).map((cat) => {
                        const list = content.watchProviders![cat];
                        if (list.length === 0) return null;
                        return (
                          <div key={cat} className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs uppercase tracking-wider text-muted-foreground w-16">
                              {cat === "stream" ? "Stream" : cat === "rent" ? "Rent" : "Buy"}
                            </span>
                            <div className="flex gap-2 flex-wrap">
                              {list.map((p) => (
                                <a
                                  key={p.id}
                                  href={content.watchProviders!.link || "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block w-10 h-10 rounded-md overflow-hidden bg-muted ring-1 ring-white/10 hover:ring-primary/40 transition"
                                  title={p.name}
                                >
                                  {p.logoUrl ? (
                                    <img src={p.logoUrl} alt={p.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full grid place-items-center text-[8px]">{p.name}</div>
                                  )}
                                </a>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />

      <DownloadDialog
        open={downloadOpen}
        onClose={() => setDownloadOpen(false)}
        source={null}
        title={content.title}
        year={content.year}
        kind={content.type === "series" ? "series" : "movie"}
      />
    </div>
  );
}

function DetailRow({
  label, value, icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="text-foreground/90 mt-0.5 flex items-start gap-1.5">
        {icon}
        <span>{value}</span>
      </div>
    </div>
  );
}
