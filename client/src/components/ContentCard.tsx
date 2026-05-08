import { Play, Plus, Info, Check, ThumbsUp } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { Content, ViewingProgress } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface ContentCardProps {
  content: Content;
  progress?: ViewingProgress;
  isWatchlist?: boolean;
  rank?: number;
  layout?: "portrait" | "landscape";
}

export function ContentCard({
  content,
  progress,
  isWatchlist,
  rank,
  layout = "portrait",
}: ContentCardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [hovering, setHovering] = useState(false);

  const progressPercent = progress
    ? (progress.progressSeconds / progress.durationSeconds) * 100
    : 0;
  const remainingMin = progress
    ? Math.max(
        0,
        Math.round(
          (progress.durationSeconds - progress.progressSeconds) / 60,
        ),
      )
    : 0;

  const { data: isInWatchlist = false } = useQuery<boolean>({
    queryKey: [`/api/watchlist/check/${content.id}`],
    retry: false,
  });

  const watchlistMutation = useMutation({
    mutationFn: async (action: "add" | "remove") => {
      if (action === "add") {
        return apiRequest("POST", "/api/watchlist", { contentId: content.id });
      } else {
        return apiRequest("DELETE", `/api/watchlist/${content.id}`, {});
      }
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/watchlist/check/${content.id}`],
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

  const isLandscape = layout === "landscape";

  return (
    <div
      className={`relative ${rank ? "pl-12 md:pl-20" : ""}`}
      data-testid={`card-content-${content.id}`}
    >
      {rank && (
        <span
          className="top10-numeral absolute left-[-2px] md:left-0 bottom-2 text-[7rem] md:text-[10rem] z-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          {rank}
        </span>
      )}

      <motion.div
        className="group relative cursor-pointer perspective-1000"
        onClick={() => {
          const isArchive = typeof content.id === "string" && content.id.startsWith("archive-");
          setLocation(isArchive ? `/free/${content.id}` : `/${content.type}/${content.id}`);
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        whileHover={{ y: -6, scale: 1.04 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        <div
          className={`relative ${isLandscape ? "aspect-video" : "aspect-[2/3]"} rounded-md overflow-hidden bg-muted shadow-card group-hover:shadow-cinematic ring-1 ring-white/5 group-hover:ring-white/15 transition-shadow duration-300`}
        >
          {content.thumbnailUrl ? (
            <img
              src={content.thumbnailUrl}
              alt={content.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 ease-cinema group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-muted-foreground bg-gradient-to-br from-muted to-card">
              <Play className="w-12 h-12 opacity-60" />
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-90" />

          <AnimatePresence>
            {hovering && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-black/95 via-black/55 to-black/10"
              >
                <div className="space-y-2">
                  <h3 className="text-base font-semibold leading-tight line-clamp-2 text-balance">
                    {content.title}
                  </h3>
                  {content.description && (
                    <p className="text-xs text-white/75 line-clamp-2">
                      {content.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-[11px] text-white/70">
                    {content.imdbRating && (
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        ⭐ {content.imdbRating}
                      </span>
                    )}
                    {content.releaseYear && <span>{content.releaseYear}</span>}
                    {content.duration && <span>{content.duration} min</span>}
                    {content.rating && (
                      <span className="border border-white/30 px-1.5 rounded text-[10px]">
                        {content.rating}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="icon"
                      className="h-9 w-9 rounded-full bg-white text-black hover:bg-white/90 hover:scale-105 transition-transform"
                      onClick={(e) => {
                        e.stopPropagation();
                        const isArchive = typeof content.id === "string" && content.id.startsWith("archive-");
                        setLocation(isArchive ? `/free/${content.id}` : `/watch/${content.id}`);
                      }}
                      data-testid={`button-play-${content.id}`}
                    >
                      <Play className="w-4 h-4 fill-black" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-full border border-white/40 bg-black/40 hover:bg-black/60 hover:border-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        watchlistMutation.mutate(
                          isInWatchlist ? "remove" : "add",
                        );
                      }}
                      disabled={watchlistMutation.isPending}
                      data-testid={`button-add-list-${content.id}`}
                    >
                      {isInWatchlist ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-full border border-white/40 bg-black/40 hover:bg-black/60 hover:border-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </Button>
                    <div className="ml-auto">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-full border border-white/40 bg-black/40 hover:bg-black/60 hover:border-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          const isArchive = typeof content.id === "string" && content.id.startsWith("archive-");
                          setLocation(isArchive ? `/free/${content.id}` : `/${content.type}/${content.id}`);
                        }}
                        data-testid={`button-info-${content.id}`}
                      >
                        <Info className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {progress && progressPercent > 0 && (
            <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
              <div className="h-1 bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-rose-400"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {!hovering && remainingMin > 0 && (
                <div className="mt-1 text-[10px] text-white/80 font-medium">
                  {remainingMin} min left
                </div>
              )}
            </div>
          )}
        </div>

        {!hovering && (
          <div className="mt-2 space-y-1 px-0.5">
            <h3
              className="text-sm font-medium line-clamp-1 text-foreground/95"
              data-testid={`text-title-${content.id}`}
            >
              {content.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {content.releaseYear && (
                <span data-testid={`text-year-${content.id}`}>
                  {content.releaseYear}
                </span>
              )}
              {content.rating && (
                <Badge
                  variant="outline"
                  className="text-[10px] h-4 px-1.5 border-white/15 text-white/70"
                >
                  {content.rating}
                </Badge>
              )}
              {content.imdbRating && (
                <span className="flex items-center gap-1 text-emerald-400/80">
                  ⭐ {content.imdbRating}
                </span>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {isWatchlist && null}
    </div>
  );
}

export function ContentCardSkeleton({
  layout = "portrait",
}: {
  layout?: "portrait" | "landscape";
}) {
  return (
    <div className="space-y-2">
      <div
        className={`shimmer rounded-md ${
          layout === "landscape" ? "aspect-video" : "aspect-[2/3]"
        }`}
      />
      <div className="shimmer h-3 w-2/3 rounded" />
      <div className="shimmer h-3 w-1/3 rounded" />
    </div>
  );
}
