import { Play, Plus, Info, Check } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
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
}

export function ContentCard({ content, progress, isWatchlist }: ContentCardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const progressPercent = progress
    ? (progress.progressSeconds / progress.durationSeconds) * 100
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
      queryClient.invalidateQueries({ queryKey: [`/api/watchlist/check/${content.id}`] });
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

  return (
    <div
      className="group relative cursor-pointer transition-transform duration-200 hover:scale-105"
      data-testid={`card-content-${content.id}`}
      onClick={() => setLocation(`/${content.type}/${content.id}`)}
    >
      <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-muted">
        {content.thumbnailUrl ? (
          <img
            src={content.thumbnailUrl}
            alt={content.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Play className="w-12 h-12" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/0 to-background/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-2">
            <Button
              size="sm"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                setLocation(`/watch/${content.id}`);
              }}
              data-testid={`button-play-${content.id}`}
            >
              <Play className="w-4 h-4 mr-2" />
              Play
            </Button>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="secondary"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  watchlistMutation.mutate(isInWatchlist ? "remove" : "add");
                }}
                disabled={watchlistMutation.isPending}
                data-testid={`button-add-list-${content.id}`}
              >
                {isInWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation(`/${content.type}/${content.id}`);
                }}
                data-testid={`button-info-${content.id}`}
              >
                <Info className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {progress && progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50">
            <div
              className="h-full bg-primary"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      <div className="mt-2 space-y-1">
        <h3 className="text-sm font-medium line-clamp-1" data-testid={`text-title-${content.id}`}>
          {content.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {content.releaseYear && (
            <span data-testid={`text-year-${content.id}`}>{content.releaseYear}</span>
          )}
          {content.rating && (
            <Badge variant="outline" className="text-xs h-5">
              {content.rating}
            </Badge>
          )}
          {content.imdbRating && (
            <span className="flex items-center gap-1">
              ⭐ {content.imdbRating}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
