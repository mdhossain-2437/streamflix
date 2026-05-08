"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Upload, ChevronLeft, Check, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
];

export default function AdminUploadPage() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<"movie" | "series">("movie");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [backdropUrl, setBackdropUrl] = useState("");
  const [trailerUrl, setTrailerUrl] = useState("");
  const [duration, setDuration] = useState<string>("");
  const [releaseYear, setReleaseYear] = useState<string>("");
  const [rating, setRating] = useState("");
  const [imdbRating, setImdbRating] = useState("");
  const [license, setLicense] = useState("");
  const [genres, setGenres] = useState<string[]>([]);

  function toggleGenre(g: string) {
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      type,
      title,
      description,
      videoUrl,
      thumbnailUrl: thumbnailUrl || null,
      backdropUrl: backdropUrl || null,
      trailerUrl: trailerUrl || null,
      duration: duration ? Number(duration) : null,
      releaseYear: releaseYear ? Number(releaseYear) : null,
      rating: rating || null,
      imdbRating: imdbRating || null,
      license: license || null,
      genres,
    };

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Status ${res.status}`);
      }
      const data = (await res.json()) as { id: string; title: string };
      toast({
        title: "Title saved",
        description: `${data.title} added to the library.`,
      });
      setTitle("");
      setDescription("");
      setVideoUrl("");
      setThumbnailUrl("");
      setBackdropUrl("");
      setTrailerUrl("");
      setDuration("");
      setReleaseYear("");
      setRating("");
      setImdbRating("");
      setLicense("");
      setGenres([]);
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative pt-32 md:pt-36 px-4 md:px-8 lg:px-16 pb-16">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-radial-fade pointer-events-none" />

        <div className="relative mx-auto max-w-3xl space-y-8">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hover:bg-white/5"
            data-testid="button-back-admin"
          >
            <Link href="/admin">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to admin
            </Link>
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-3"
          >
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-primary">
              <Upload className="w-3.5 h-3.5" />
              New title
            </span>
            <h1 className="font-display text-balance text-[clamp(2rem,5vw,3.5rem)] leading-[0.95] tracking-[0.005em]">
              Add a film or series
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Manifest URL must be an HLS playlist (.m3u8) or a direct mp4. Only
              upload titles you have rights to distribute.
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as "movie" | "series")}>
                  <SelectTrigger id="type" data-testid="select-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="movie">Movie</SelectItem>
                    <SelectItem value="series">Series</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="input-title"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-testid="input-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="videoUrl">Manifest / video URL *</Label>
              <Input
                id="videoUrl"
                type="url"
                required
                placeholder="https://stream.example.com/film.m3u8"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                data-testid="input-video-url"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="thumbnailUrl">Poster URL</Label>
                <Input
                  id="thumbnailUrl"
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  data-testid="input-thumbnail-url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="backdropUrl">Backdrop URL</Label>
                <Input
                  id="backdropUrl"
                  type="url"
                  value={backdropUrl}
                  onChange={(e) => setBackdropUrl(e.target.value)}
                  data-testid="input-backdrop-url"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  data-testid="input-duration"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="releaseYear">Release year</Label>
                <Input
                  id="releaseYear"
                  type="number"
                  min={1880}
                  max={2100}
                  value={releaseYear}
                  onChange={(e) => setReleaseYear(e.target.value)}
                  data-testid="input-release-year"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rating">Rating</Label>
                <Input
                  id="rating"
                  placeholder="PG-13"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  data-testid="input-rating"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="imdbRating">IMDb rating</Label>
                <Input
                  id="imdbRating"
                  placeholder="8.4"
                  value={imdbRating}
                  onChange={(e) => setImdbRating(e.target.value)}
                  data-testid="input-imdb-rating"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license">License</Label>
                <Input
                  id="license"
                  placeholder="CC-BY-4.0 / Owned / Licensed"
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                  data-testid="input-license"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Genres</Label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((g) => {
                  const active = genres.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGenre(g)}
                      className={`h-8 px-3.5 text-xs font-medium tracking-wide rounded-full transition-all duration-200 ${
                        active
                          ? "bg-primary/90 text-primary-foreground border border-primary shadow-glow-sm"
                          : "bg-white/[0.04] border border-white/10 text-foreground/80 hover:bg-white/[0.08]"
                      }`}
                      data-testid={`button-genre-${g.toLowerCase()}`}
                    >
                      {active && <Check className="w-3 h-3 mr-1 inline" />}
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              size="lg"
              className="w-full md:w-auto rounded-full h-12 px-10 bg-primary text-primary-foreground hover:bg-primary-hover font-bold uppercase tracking-[0.18em] text-xs shadow-glow"
              data-testid="button-submit-upload"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save title"
              )}
            </Button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}
