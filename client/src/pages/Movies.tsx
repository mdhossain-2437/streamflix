import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
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

export default function Movies() {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("popular");

  const { data: movies = [], isLoading } = useQuery<Content[]>({
    queryKey: ["/api/content", { type: "movie", genres: selectedGenres, sort: sortBy }],
  });

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 md:pt-28 px-4 md:px-8 lg:px-16 pb-16">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-page-title">
              Movies
            </h1>
            <p className="text-muted-foreground">
              Explore our collection of movies
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Genres:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => (
                <Badge
                  key={genre}
                  variant={selectedGenres.includes(genre) ? "default" : "outline"}
                  className="cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => toggleGenre(genre)}
                  data-testid={`badge-genre-${genre.toLowerCase()}`}
                >
                  {genre}
                </Badge>
              ))}
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 ml-auto" data-testid="select-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="recent">Recently Added</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          ) : movies.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {movies.map((movie) => (
                <ContentCard key={movie.id} content={movie} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No movies found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
