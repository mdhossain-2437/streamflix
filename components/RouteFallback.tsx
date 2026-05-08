"use client";

// Cinematic suspense fallback shown during lazy route chunks.
// Pulses the brand mark while the next route resolves.
export function RouteFallback() {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <div className="font-display text-5xl tracking-[0.04em] animate-glow-pulse">
          STREAM<span className="text-primary">FLIX</span>
        </div>
        <div className="h-px w-32 overflow-hidden bg-white/10">
          <div className="h-full w-1/3 bg-primary animate-marquee-line" />
        </div>
      </div>
    </div>
  );
}
