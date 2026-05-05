import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ContentCard } from "@/components/ContentCard";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { usePerson } from "@/lib/api";
import { tmdbToContent } from "@/lib/tmdbAdapter";

export default function Person() {
  const [, params] = useRoute("/person/:id");
  const [, setLocation] = useLocation();
  const { data: person, isLoading } = usePerson(params?.id);

  if (isLoading || !person) {
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative pt-28 md:pt-32 px-4 md:px-8 lg:px-16 pb-16">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-radial-fade pointer-events-none" />

        <div className="relative">
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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="grid md:grid-cols-[280px,1fr] gap-8 md:gap-12 items-start"
          >
            <div className="aspect-[2/3] rounded-xl overflow-hidden bg-muted shadow-cinematic ring-1 ring-white/10 max-w-[300px]">
              {person.imageUrl ? (
                <img
                  src={person.imageUrl}
                  alt={person.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/30 to-rose-700/30" />
              )}
            </div>

            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
                  {person.knownForDepartment || "Talent"}
                </span>
                <h1 className="font-display text-balance text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.95] tracking-[0.005em] mt-2">
                  {person.name}
                </h1>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm max-w-2xl">
                {person.birthday && (
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Born</span>
                    <div className="text-foreground/90 mt-0.5">
                      {person.birthday}
                      {person.placeOfBirth ? ` • ${person.placeOfBirth}` : ""}
                    </div>
                  </div>
                )}
                {person.deathday && (
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Died</span>
                    <div className="text-foreground/90 mt-0.5">{person.deathday}</div>
                  </div>
                )}
              </div>

              {person.biography && (
                <p className="text-base leading-relaxed text-white/85 max-w-3xl text-balance whitespace-pre-line">
                  {person.biography}
                </p>
              )}
            </div>
          </motion.div>

          {person.credits.length > 0 && (
            <section className="mt-12 space-y-4">
              <h2 className="text-lg md:text-xl font-semibold tracking-tight">Filmography</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                {person.credits.slice(0, 60).map((c) => (
                  <div key={c.id} onClick={() => setLocation(`/${c.type}/${c.id}`)}>
                    <ContentCard content={tmdbToContent(c)} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
