"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Upload,
  Library,
  Sparkles,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const ADMIN_TILES = [
  {
    href: "/admin/upload",
    icon: Upload,
    title: "Upload a film",
    body: "Add a single title with a manifest URL, poster, license, and cast — saved to the library with source = manual.",
    cta: "New title",
  },
  {
    href: "/admin/import-archive",
    icon: Library,
    title: "Import from Internet Archive",
    body: "Search public-domain films on archive.org, preview metadata, and bulk-ingest with full source attribution.",
    cta: "Browse archive",
  },
];

export default function AdminDashboardPage() {
  const { toast } = useToast();

  async function syncCC() {
    const res = await fetch("/api/admin/sync-cc", { method: "POST" });
    if (!res.ok) {
      toast({
        title: "Sync failed",
        description: `Status ${res.status}`,
        variant: "destructive",
      });
      return;
    }
    const data = (await res.json()) as { inserted: number };
    toast({
      title: "Creative Commons sync",
      description: `Inserted ${data.inserted} films.`,
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative pt-32 md:pt-36 px-4 md:px-8 lg:px-16 pb-16">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-radial-fade pointer-events-none" />

        <div className="relative mx-auto max-w-6xl space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-3"
          >
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-primary">
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin console
            </span>
            <h1
              className="font-display text-balance text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.95] tracking-[0.005em]"
              data-testid="text-admin-title"
            >
              Library control room
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Curate the catalog. Every row tracks its own source — Internet
              Archive, Creative Commons, or manual upload — so legitimacy is
              auditable end-to-end.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4">
            {ADMIN_TILES.map((tile) => (
              <Link
                key={tile.href}
                href={tile.href}
                className="group rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 hover:bg-white/[0.05] hover:border-white/[0.18] transition-all duration-500"
                data-testid={`admin-tile-${tile.href.split("/").pop()}`}
              >
                <div className="mb-6 flex items-center justify-between">
                  <tile.icon
                    className="w-7 h-7 text-primary"
                    strokeWidth={1.5}
                  />
                  <ArrowRight className="w-4 h-4 text-foreground/40 group-hover:translate-x-1 group-hover:text-foreground transition-all duration-500" />
                </div>
                <h3 className="font-display text-2xl uppercase tracking-[0.02em] mb-3">
                  {tile.title}
                </h3>
                <p className="text-foreground/70 leading-relaxed mb-6">
                  {tile.body}
                </p>
                <span className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
                  {tile.cta} →
                </span>
              </Link>
            ))}

            <div className="md:col-span-2 rounded-3xl border border-white/[0.08] bg-gradient-to-br from-primary/[0.08] via-rose-700/[0.04] to-transparent p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-primary">
                  <Sparkles className="w-3.5 h-3.5" />
                  One-tap action
                </div>
                <h3 className="font-display text-2xl md:text-3xl uppercase tracking-[0.02em]">
                  Sync the Creative Commons catalog
                </h3>
                <p className="text-foreground/70 max-w-2xl">
                  Inserts the curated set of Blender Studio films + open-source
                  features (Big Buck Bunny, Sintel, Tears of Steel, Cosmos
                  Laundromat, Spring, etc.) — every row marked CC-BY.
                </p>
              </div>
              <Button
                onClick={syncCC}
                className="rounded-full h-12 px-8 bg-primary text-primary-foreground hover:bg-primary-hover font-bold uppercase tracking-[0.18em] text-xs shadow-glow"
                data-testid="button-sync-cc"
              >
                Sync now
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
