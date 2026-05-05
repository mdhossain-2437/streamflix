import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Trash2, Bookmark, Compass } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ContentCard, ContentCardSkeleton } from "@/components/ContentCard";
import { Footer } from "@/components/Footer";
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
      toast({ title: "Removed from watchlist" });
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative pt-32 md:pt-36 px-4 md:px-8 lg:px-16 pb-16">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-radial-fade pointer-events-none" />

        <div className="relative space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-end justify-between flex-wrap gap-4"
          >
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-primary">
                <Bookmark className="w-3.5 h-3.5" /> Saved by you
              </span>
              <h1
                className="font-display text-balance text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.95] tracking-[0.005em]"
                data-testid="text-page-title"
              >
                My List
              </h1>
              <p className="text-muted-foreground">
                {isLoadingWatchlist
                  ? "Loading your queue…"
                  : `${watchlist.length} ${watchlist.length === 1 ? "title" : "titles"} ready for tonight.`}
              </p>
            </div>
          </motion.div>

          {isLoading || isLoadingWatchlist ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
              {Array.from({ length: 12 }).map((_, i) => (
                <ContentCardSkeleton key={i} />
              ))}
            </div>
          ) : watchlist.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
              {watchlist.map((content, i) => (
                <motion.div
                  key={content.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.02, 0.4) }}
                  className="relative group"
                >
                  <ContentCard content={content} isWatchlist />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-glow-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeMutation.mutate(content.id);
                    }}
                    disabled={removeMutation.isPending}
                    data-testid={`button-remove-${content.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 space-y-5 max-w-md mx-auto">
              <div className="mx-auto w-20 h-20 grid place-items-center rounded-full bg-gradient-to-br from-primary/20 to-rose-700/10 border border-white/10">
                <Bookmark className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-semibold">Your list is empty</p>
                <p className="text-muted-foreground">
                  Save movies and shows to watch later — they'll appear here ready to play.
                </p>
              </div>
              <Link href="/">
                <Button className="btn-cinema h-11 px-6">
                  <Compass className="w-4 h-4 mr-2" />
                  Browse titles
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
