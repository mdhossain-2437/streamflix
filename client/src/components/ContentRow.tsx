import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import type { Content, ViewingProgress } from "@shared/schema";
import { ContentCard } from "./ContentCard";
import { Button } from "@/components/ui/button";

interface ContentRowProps {
  title: string;
  contents: Content[];
  progress?: Record<string, ViewingProgress>;
  seeAllLink?: string;
}

export function ContentRow({ title, contents, progress, seeAllLink }: ContentRowProps) {
  return (
    <div className="space-y-4" data-testid={`content-row-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between px-4 md:px-8 lg:px-16">
        <h2 className="text-xl md:text-2xl font-semibold" data-testid={`text-row-title-${title.toLowerCase().replace(/\s+/g, "-")}`}>
          {title}
        </h2>
        {seeAllLink && (
          <Link href={seeAllLink}>
            <Button variant="ghost" size="sm" data-testid={`button-see-all-${title.toLowerCase().replace(/\s+/g, "-")}`}>
              See All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        )}
      </div>

      <div className="relative">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-8 lg:px-16 pb-4 snap-x snap-mandatory">
          {contents.map((content) => (
            <div key={content.id} className="flex-none w-40 md:w-48 lg:w-56 snap-start">
              <ContentCard
                content={content}
                progress={progress?.[content.id]}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
