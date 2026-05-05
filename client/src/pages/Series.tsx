import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { ContentCard, ContentCardSkeleton } from "@/components/ContentCard";
import { Footer } from "@/components/Footer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Content } from "@shared/schema";

const GENRES = [
  "Action",
  "Comedy",
  "Drama",
  "Horror",
  "Sci-Fi",
  "Romance",
  "Thriller",
  "Documentary",
];

export default function Series() {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("popular");

  const { data: series = [], isLoading } = useQuery<Content[]>({
    queryKey: ["/api/content", { type: "series", genres: selectedGenres, sort: sortBy }],
  });

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  };

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
            className="space-y-3"
          >
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
              Library
            </span>
            <h1
              className="font-display text-balance text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.95] tracking-[0.005em]"
              data-testid="text-page-title"
            >
              TV Shows
            </h1>
            <p className="text-muted-foreground max-w-xl">
              Binge-worthy series, weekly drops and award-winning originals across every genre.
            </p>
          </motion.div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-foreground/80">
              <Filter className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Genres</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => {
                const active = selectedGenres.includes(genre);
                return (
                  <Badge
                    key={genre}
                    variant={active ? "default" : "outline"}
                    className={`cursor-pointer h-8 px-3.5 text-xs font-medium tracking-wide transition-all duration-200 ${
                      active
                        ? "bg-primary/90 text-primary-foreground border-primary shadow-glow-sm"
                        : "bg-white/[0.04] border-white/10 text-foreground/80 hover:bg-white/[0.08]"
                    }`}
                    onClick={() => toggleGenre(genre)}
                    data-testid={`badge-genre-${genre.toLowerCase()}`}
                  >
                    {genre}
                  </Badge>
                );
              })}
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger
                className="w-44 ml-auto bg-white/[0.04] border-white/10 hover:bg-white/[0.08]"
                data-testid="select-sort"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass">
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="recent">Recently Added</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
              {Array.from({ length: 18 }).map((_, i) => (
                <ContentCardSkeleton key={i} />
              ))}
            </div>
          ) : series.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
              {series.map((show, i) => (
                <motion.div
                  key={show.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: Math.min(i * 0.02, 0.5) }}
                >
                  <ContentCard content={show} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 space-y-3">
              <p className="text-2xl font-semibold">No TV shows found</p>
              <p className="text-muted-foreground">
                Try adjusting your genre filters.
              </p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
