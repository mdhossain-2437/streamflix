"use client";

import { ChevronRight, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import type { Content, ViewingProgress } from "@shared/schema";
import { ContentCard, ContentCardSkeleton } from "./ContentCard";
import { Button } from "@/components/ui/button";

interface ContentRowProps {
  title: string;
  subtitle?: string;
  contents: Content[];
  progress?: Record<string, ViewingProgress>;
  seeAllLink?: string;
  variant?: "default" | "top10";
  isLoading?: boolean;
  skeletonCount?: number;
}

export function ContentRow({
  title,
  subtitle,
  contents,
  progress,
  seeAllLink,
  variant = "default",
  isLoading = false,
  skeletonCount = 8,
}: ContentRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const isTop10 = variant === "top10";

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.85;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  const slug = title.toLowerCase().replace(/\s+/g, "-");

  return (
    <section
      className="group/section space-y-3 md:space-y-4"
      data-testid={`content-row-${slug}`}
    >
      <div className="flex items-end justify-between px-4 md:px-8 lg:px-16">
        <div className="space-y-1">
          {isTop10 && (
            <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary/90">
              <span className="h-px w-6 bg-primary/70" />
              Top 10 in your country today
            </span>
          )}
          <h2
            className="text-xl md:text-2xl font-bold tracking-tight text-foreground/95"
            data-testid={`text-row-title-${slug}`}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {seeAllLink && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground gap-1 group/see"
            data-testid={`button-see-all-${slug}`}
          >
            <Link href={seeAllLink}>
              See All
              <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover/see:translate-x-0.5" />
            </Link>
          </Button>
        )}
      </div>

      <div className="relative group">
        <button
          onClick={() => scrollBy(-1)}
          className="row-arrow left-0"
          aria-label="Scroll left"
          data-testid={`button-scroll-left-${slug}`}
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
        <button
          onClick={() => scrollBy(1)}
          className="row-arrow right-0 right"
          aria-label="Scroll right"
          data-testid={`button-scroll-right-${slug}`}
        >
          <ChevronRight className="w-7 h-7" />
        </button>

        <div
          ref={scrollerRef}
          className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide px-4 md:px-8 lg:px-16 pb-6 snap-x snap-mandatory scroll-smooth"
        >
          {isLoading
            ? Array.from({ length: skeletonCount }).map((_, i) => (
                <div
                  key={i}
                  className="flex-none w-36 md:w-44 lg:w-52 snap-start"
                >
                  <ContentCardSkeleton />
                </div>
              ))
            : contents.map((content, i) => (
                <div
                  key={content.id}
                  className={`flex-none snap-start ${
                    isTop10
                      ? "w-44 md:w-52 lg:w-60"
                      : "w-36 md:w-44 lg:w-52"
                  }`}
                >
                  <ContentCard
                    content={content}
                    progress={progress?.[content.id]}
                    rank={isTop10 ? i + 1 : undefined}
                  />
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
