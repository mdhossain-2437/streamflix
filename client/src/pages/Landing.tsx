import { Play, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-screen">
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/70 to-background z-10" />
        
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1574267432644-f610b91c88d1?w=1600&h=900&fit=crop')`,
          }}
        />

        <div className="relative z-20 h-full flex items-center px-4 md:px-8 lg:px-16">
          <div className="max-w-2xl space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Unlimited movies, TV shows, and more
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Watch anywhere. Cancel anytime.
            </p>
            <p className="text-base md:text-lg">
              Ready to watch? Sign in to start your entertainment journey.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Button
                size="lg"
                className="text-base px-8"
                asChild
                data-testid="button-login"
              >
                <a href="/api/login">
                  <Play className="w-5 h-5 mr-2" />
                  Get Started
                </a>
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="text-base px-8"
                data-testid="button-learn-more"
              >
                <Info className="w-5 h-5 mr-2" />
                Learn More
              </Button>
            </div>
          </div>
        </div>

        <div className="absolute top-0 left-0 right-0 z-30 px-4 md:px-8 lg:px-16">
          <div className="flex items-center justify-between h-16 md:h-20">
            <span className="text-primary text-2xl md:text-3xl font-bold">StreamFlix</span>
            <Button variant="default" asChild data-testid="button-signin-nav">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </div>

      <div className="py-16 md:py-24 px-4 md:px-8 lg:px-16 space-y-16">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">Enjoy on your TV</h2>
            <p className="text-lg text-muted-foreground">
              Watch on Smart TVs, PlayStation, Xbox, Chromecast, Apple TV, Blu-ray players, and more.
            </p>
          </div>
          <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
            <Play className="w-16 h-16 text-muted-foreground" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="order-2 md:order-1 aspect-video rounded-lg bg-muted flex items-center justify-center">
            <Play className="w-16 h-16 text-muted-foreground" />
          </div>
          <div className="order-1 md:order-2 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">Download your shows to watch offline</h2>
            <p className="text-lg text-muted-foreground">
              Save your favorites easily and always have something to watch.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">Watch everywhere</h2>
            <p className="text-lg text-muted-foreground">
              Stream unlimited movies and TV shows on your phone, tablet, laptop, and TV.
            </p>
          </div>
          <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
            <Play className="w-16 h-16 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}
