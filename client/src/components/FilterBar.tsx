// Reusable filter / sort bar for Movies / Series / Discover pages.
// Genre chips (multi-select), year filter, runtime filter, min-rating slider,
// sort dropdown. Genres are loaded from /api/tmdb/genres for accuracy.
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Filter, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useGenres } from "@/lib/api";

export interface FilterState {
  genres: number[];
  year: string;
  sort: string;
  minRating: number;
  minRuntime: number;
  maxRuntime: number;
  language: string;
}

const DEFAULT_FILTERS: FilterState = {
  genres: [],
  year: "",
  sort: "popularity.desc",
  minRating: 0,
  minRuntime: 0,
  maxRuntime: 400,
  language: "",
};

const SORT_OPTIONS_MOVIE = [
  { value: "popularity.desc", label: "Most Popular" },
  { value: "popularity.asc", label: "Least Popular" },
  { value: "vote_average.desc", label: "Highest Rated" },
  { value: "vote_average.asc", label: "Lowest Rated" },
  { value: "primary_release_date.desc", label: "Newest First" },
  { value: "primary_release_date.asc", label: "Oldest First" },
  { value: "revenue.desc", label: "Highest Grossing" },
  { value: "original_title.asc", label: "Title A–Z" },
];

const SORT_OPTIONS_TV = [
  { value: "popularity.desc", label: "Most Popular" },
  { value: "popularity.asc", label: "Least Popular" },
  { value: "vote_average.desc", label: "Highest Rated" },
  { value: "first_air_date.desc", label: "Newest First" },
  { value: "first_air_date.asc", label: "Oldest First" },
  { value: "name.asc", label: "Title A–Z" },
];

const LANGUAGES = [
  { value: "", label: "Any language" },
  { value: "en", label: "English" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "hi", label: "Hindi" },
  { value: "zh", label: "Chinese" },
  { value: "it", label: "Italian" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = ["", ...Array.from({ length: 60 }, (_, i) => String(CURRENT_YEAR - i))];

interface FilterBarProps {
  kind: "movie" | "tv";
  value: FilterState;
  onChange: (state: FilterState) => void;
}

export function FilterBar({ kind, value, onChange }: FilterBarProps) {
  const { data: genres } = useGenres(kind);
  const [open, setOpen] = useState(false);
  const [localRuntime, setLocalRuntime] = useState<[number, number]>([
    value.minRuntime,
    value.maxRuntime,
  ]);

  // Sync local slider state if the parent resets filters externally.
  useEffect(() => {
    setLocalRuntime([value.minRuntime, value.maxRuntime]);
  }, [value.minRuntime, value.maxRuntime]);

  const sortOptions = kind === "tv" ? SORT_OPTIONS_TV : SORT_OPTIONS_MOVIE;

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = [];
    value.genres.forEach((id) => {
      const g = genres?.find((x) => x.id === id);
      chips.push({
        key: `g-${id}`,
        label: g?.name || `#${id}`,
        clear: () => onChange({ ...value, genres: value.genres.filter((x) => x !== id) }),
      });
    });
    if (value.year) {
      chips.push({
        key: "year",
        label: `Year: ${value.year}`,
        clear: () => onChange({ ...value, year: "" }),
      });
    }
    if (value.minRating > 0) {
      chips.push({
        key: "rating",
        label: `≥ ${value.minRating.toFixed(1)}★`,
        clear: () => onChange({ ...value, minRating: 0 }),
      });
    }
    if (value.minRuntime > 0 || value.maxRuntime < 400) {
      chips.push({
        key: "runtime",
        label: `${value.minRuntime}–${value.maxRuntime} min`,
        clear: () =>
          onChange({ ...value, minRuntime: 0, maxRuntime: 400 }),
      });
    }
    if (value.language) {
      const l = LANGUAGES.find((x) => x.value === value.language);
      chips.push({
        key: "lang",
        label: l?.label || value.language,
        clear: () => onChange({ ...value, language: "" }),
      });
    }
    return chips;
  }, [value, genres, onChange]);

  const toggleGenre = (id: number) => {
    onChange({
      ...value,
      genres: value.genres.includes(id)
        ? value.genres.filter((g) => g !== id)
        : [...value.genres, id],
    });
  };

  const reset = () => onChange(DEFAULT_FILTERS);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen((o) => !o)}
          className="bg-white/[0.04] border-white/10 hover:bg-white/[0.08] gap-2"
          data-testid="filter-toggle"
        >
          <Filter className="w-4 h-4" />
          Filters
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </Button>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeChips.map((c) => (
              <Badge
                key={c.key}
                variant="default"
                className="bg-primary/90 hover:bg-primary text-primary-foreground border-primary/0 gap-1 pr-1.5 pl-2.5 cursor-pointer"
                onClick={c.clear}
              >
                {c.label}
                <X className="w-3 h-3" />
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              className="text-xs h-7 hover:bg-white/5 text-muted-foreground"
              data-testid="filter-reset"
            >
              Clear all
            </Button>
          </div>
        )}

        <Select value={value.sort} onValueChange={(v) => onChange({ ...value, sort: v })}>
          <SelectTrigger
            className="w-44 ml-auto bg-white/[0.04] border-white/10 hover:bg-white/[0.08]"
            data-testid="filter-sort"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass">
            {sortOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-6">
              {genres && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-3 block">
                    Genres
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {genres.map((g) => {
                      const active = value.genres.includes(g.id);
                      return (
                        <Badge
                          key={g.id}
                          variant={active ? "default" : "outline"}
                          className={`cursor-pointer h-8 px-3.5 text-xs font-medium tracking-wide transition-all ${
                            active
                              ? "bg-primary/90 text-primary-foreground border-primary shadow-glow-sm"
                              : "bg-white/[0.04] border-white/10 text-foreground/80 hover:bg-white/[0.08]"
                          }`}
                          onClick={() => toggleGenre(g.id)}
                          data-testid={`filter-genre-${g.id}`}
                        >
                          {g.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-3 block">
                    Year
                  </label>
                  <Select
                    value={value.year}
                    onValueChange={(v) => onChange({ ...value, year: v })}
                  >
                    <SelectTrigger className="bg-white/[0.04] border-white/10">
                      <SelectValue placeholder="Any year" />
                    </SelectTrigger>
                    <SelectContent className="glass max-h-72">
                      {YEARS.map((y) => (
                        <SelectItem key={y || "any"} value={y}>
                          {y || "Any year"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-3 block">
                    Language
                  </label>
                  <Select
                    value={value.language}
                    onValueChange={(v) => onChange({ ...value, language: v })}
                  >
                    <SelectTrigger className="bg-white/[0.04] border-white/10">
                      <SelectValue placeholder="Any language" />
                    </SelectTrigger>
                    <SelectContent className="glass">
                      {LANGUAGES.map((l) => (
                        <SelectItem key={l.value || "any"} value={l.value}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-3 flex items-center justify-between">
                    Minimum Rating
                    <span className="text-foreground/90">{value.minRating.toFixed(1)}★</span>
                  </label>
                  <Slider
                    value={[value.minRating]}
                    onValueChange={(v) => onChange({ ...value, minRating: v[0] })}
                    min={0}
                    max={9}
                    step={0.5}
                  />
                </div>
              </div>

              {kind === "movie" && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-3 flex items-center justify-between">
                    Runtime (minutes)
                    <span className="text-foreground/90">
                      {localRuntime[0]} – {localRuntime[1]} min
                    </span>
                  </label>
                  <Slider
                    value={localRuntime}
                    onValueChange={(v) => setLocalRuntime([v[0], v[1]])}
                    onValueCommit={(v) =>
                      onChange({ ...value, minRuntime: v[0], maxRuntime: v[1] })
                    }
                    min={0}
                    max={400}
                    step={10}
                    minStepsBetweenThumbs={1}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { DEFAULT_FILTERS };
