import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Content } from "@shared/schema";

export default function Watchlist() {
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

  const { data: watchlist = [], isLoading: isLoadingWatchlist } = useQuery<Content[]>({
    queryKey: ["/api/watchlist"],
  });

  const removeMutation = useMutation({
    mutationFn: async (contentId: string) => {
      return apiRequest("DELETE", `/api/watchlist/${contentId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Removed from watchlist",
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
        description: "Failed to remove from watchlist",
        variant: "destructive",
      });
    },
  });

  if (isLoading || isLoadingWatchlist) {
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

      <div className="pt-24 md:pt-28 px-4 md:px-8 lg:px-16 pb-16">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-page-title">
              My List
            </h1>
            <p className="text-muted-foreground">
              {watchlist.length} {watchlist.length === 1 ? "item" : "items"} in your watchlist
            </p>
          </div>

          {watchlist.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {watchlist.map((content) => (
                <div key={content.id} className="relative group">
                  <ContentCard content={content} isWatchlist />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={(e) => {
                      e.preventDefault();
                      removeMutation.mutate(content.id);
                    }}
                    disabled={removeMutation.isPending}
                    data-testid={`button-remove-${content.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 space-y-4">
              <p className="text-xl text-muted-foreground">Your watchlist is empty</p>
              <p className="text-muted-foreground">
                Browse movies and TV shows to add them to your list
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
