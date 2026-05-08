// Collections page — curated TMDB collections (e.g., Bond, MCU, Studio Ghibli).
// /collections lists thumbnails; /collection/:id loads the parts of one collection.
import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContentCard, ContentCardSkeleton } from "@/components/ContentCard";
import { tmdbToContent } from "@/lib/tmdbAdapter";
import type { CatalogItem } from "@/lib/api";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CuratedCollection {
  id: number;
  name: string;
  description: string;
  posterPath: string | null;
}

const CURATED: CuratedCollection[] = [
  { id: 10, name: "Star Wars Saga", description: "The Skywalker arc", posterPath: null },
  { id: 86311, name: "Marvel Cinematic Universe (Avengers)", description: "The Infinity Saga and beyond", posterPath: null },
  { id: 645, name: "James Bond", description: "60+ years of 007", posterPath: null },
  { id: 1241, name: "Harry Potter", description: "The wizarding world", posterPath: null },
  { id: 119, name: "The Lord of the Rings", description: "Peter Jackson's trilogy", posterPath: null },
  { id: 87359, name: "Mission: Impossible", description: "Tom Cruise practical-stunts canon", posterPath: null },
  { id: 9485, name: "Fast & Furious", description: "Family.", posterPath: null },
  { id: 1241, name: "Pirates of the Caribbean", description: "Cursed gold and Jack Sparrow", posterPath: null },
  { id: 8945, name: "Mad Max", description: "Post-apocalyptic Australia", posterPath: null },
  { id: 9735, name: "Indiana Jones", description: "Whip-cracking adventures", posterPath: null },
  { id: 33514, name: "The Conjuring Universe", description: "James Wan's haunted canon", posterPath: null },
  { id: 295, name: "Pirates of the Caribbean", description: "Disney swashbuckling", posterPath: null },
  { id: 263, name: "The Dark Knight Trilogy", description: "Nolan's Batman", posterPath: null },
  { id: 528, name: "The Terminator Collection", description: "Skynet rises", posterPath: null },
  { id: 1570, name: "Die Hard", description: "Yippee-ki-yay", posterPath: null },
  { id: 9735, name: "Studio Ghibli", description: "Miyazaki's worlds", posterPath: null },
  { id: 91361, name: "Toy Story", description: "To infinity and beyond", posterPath: null },
  { id: 87096, name: "Avatar", description: "Pandora returns", posterPath: null },
];

interface CollectionDetail {
  id: number;
  name: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  parts: Array<{
    id: number;
    title: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    release_date: string;
    vote_average: number;
  }>;
}

export default function Collections() {
  const [, params] = useRoute<{ id: string }>("/collection/:id");
  const id = params?.id;

  if (!id) return <CollectionsList />;
  return <CollectionDetailView id={id} />;
}

function CollectionsList() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-32 md:pt-36 px-4 md:px-8 lg:px-16 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-3 mb-8"
        >
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
            Collections
          </span>
          <h1 className="font-display text-balance text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.95]">
            Franchises &amp; Sagas
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Watch a multi-film story in order. Powered by TMDB collections.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CURATED.map((c) => (
            <Link key={c.id} href={`/collection/${c.id}`}>
              <a className="block rounded-xl overflow-hidden border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/40 transition-colors p-5">
                <div className="text-base font-bold mb-1">{c.name}</div>
                <p className="text-sm text-muted-foreground">{c.description}</p>
              </a>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}

function CollectionDetailView({ id }: { id: string }) {
  const [data, setData] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/tmdb/collection/${id}`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((d: CollectionDetail) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-32 md:pt-36 px-4 md:px-8 lg:px-16 pb-16">
        <Link href="/collections">
          <Button variant="ghost" className="-ml-3 mb-3" data-testid="collection-back">
            <ChevronLeft className="w-4 h-4 mr-1" />
            All collections
          </Button>
        </Link>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 12 }).map((_, i) => <ContentCardSkeleton key={i} />)}
          </div>
        ) : error || !data ? (
          <div className="py-20 text-center text-muted-foreground">
            Couldn't load this collection.
          </div>
        ) : (
          <>
            <h1 className="font-display text-balance text-[clamp(2rem,5vw,3.5rem)] leading-[0.95] mb-3">
              {data.name}
            </h1>
            <p className="text-muted-foreground max-w-2xl mb-8">{data.overview}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
              {data.parts
                .sort((a, b) => (a.release_date || "").localeCompare(b.release_date || ""))
                .map((p) => {
                  const item: CatalogItem = {
                    id: `tmdb-movie-${p.id}`,
                    tmdbId: p.id,
                    type: "movie",
                    title: p.title,
                    description: p.overview,
                    posterUrl: p.poster_path ? `https://image.tmdb.org/t/p/w500${p.poster_path}` : null,
                    backdropUrl: p.backdrop_path ? `https://image.tmdb.org/t/p/original${p.backdrop_path}` : null,
                    thumbnailUrl: p.backdrop_path
                      ? `https://image.tmdb.org/t/p/w780${p.backdrop_path}`
                      : (p.poster_path ? `https://image.tmdb.org/t/p/w500${p.poster_path}` : null),
                    rating: p.vote_average,
                    voteAverage: p.vote_average,
                    voteCount: null,
                    popularity: null,
                    year: p.release_date ? p.release_date.slice(0, 4) : "",
                    durationMin: null,
                    seasons: null,
                    episodes: null,
                    genres: [],
                    genreIds: [],
                    originalLanguage: null,
                    adult: false,
                  };
                  return <ContentCard key={p.id} content={tmdbToContent(item)} />;
                })}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
