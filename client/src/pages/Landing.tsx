import { Play, Info, Tv2, Download, Smartphone, Users, ArrowRight, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Footer } from "@/components/Footer";

const features = [
  {
    icon: Tv2,
    title: "Cinematic on every screen",
    desc: "Smart TVs, PlayStation, Xbox, Apple TV, Chromecast. 4K HDR Dolby Vision when supported.",
    accent: "from-rose-500/30 to-rose-700/0",
  },
  {
    icon: Download,
    title: "Download & go offline",
    desc: "Save your favorites with one tap. Watch on flights, trains, or anywhere off-grid.",
    accent: "from-amber-500/30 to-amber-700/0",
  },
  {
    icon: Smartphone,
    title: "Pick up where you left off",
    desc: "Phone, tablet, laptop, TV. Seamless playback across every device, perfectly in sync.",
    accent: "from-sky-500/30 to-sky-700/0",
  },
  {
    icon: Users,
    title: "Profiles for every taste",
    desc: "Up to 5 personalized profiles with kid-safe spaces and tailor-made recommendations.",
    accent: "from-violet-500/30 to-violet-700/0",
  },
];

const faqs = [
  {
    q: "What is StreamFlix?",
    a: "StreamFlix is a cinematic streaming service that brings award-winning movies, TV shows, anime, and originals to every screen — anywhere, anytime, ad-free.",
  },
  {
    q: "How much does it cost?",
    a: "From $7.99/mo for Mobile to $19.99/mo for Premium 4K. No contracts, cancel online in two clicks, no fees.",
  },
  {
    q: "Where can I watch?",
    a: "Web, iOS, Android, smart TVs, Apple TV, Chromecast, PS5, Xbox Series X|S, Roku, and more — your account follows you everywhere.",
  },
  {
    q: "How do I cancel?",
    a: "Cancel online any time. There are no commitments. You can also pause your membership and resume later without losing your watchlist.",
  },
  {
    q: "What can I watch on StreamFlix?",
    a: "An ever-growing library of feature films, original series, documentaries, anime and live events. New titles added every week.",
  },
];

const trustLogos = ["Apple TV", "Chromecast", "Roku", "Xbox", "PlayStation", "FireTV", "Samsung TV", "LG"];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* HERO */}
      <section className="relative h-[100svh] min-h-[640px] noise">
        {/* backdrop */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center animate-kenburns"
            style={{
              backgroundImage:
                "url('https://picsum.photos/seed/streamflix-hero/2400/1350')",
            }}
          />
        </div>
        {/* scrims */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30" />
        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-b from-transparent to-background" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background/95 to-transparent" />
        <div className="absolute inset-0 bg-radial-fade pointer-events-none" />

        {/* nav */}
        <div className="absolute top-0 left-0 right-0 z-30 px-4 md:px-8 lg:px-16">
          <div className="flex items-center justify-between h-16 md:h-20">
            <span className="font-display tracking-[0.04em] text-3xl md:text-4xl text-primary drop-shadow-[0_2px_12px_rgba(229,9,20,0.55)]">
              STREAM<span className="text-foreground">FLIX</span>
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="hidden sm:inline-flex text-foreground/80 hover:text-foreground"
              >
                English
              </Button>
              <Button asChild className="btn-cinema h-10 px-5" data-testid="button-signin-nav">
                <a href="/api/login">Sign In</a>
              </Button>
            </div>
          </div>
        </div>

        {/* hero copy */}
        <div className="relative z-20 h-full flex items-center px-4 md:px-8 lg:px-16">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
            }}
            className="max-w-2xl space-y-6"
          >
            <motion.span
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
              }}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 backdrop-blur-md px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-glow-pulse" />
              <span className="text-gradient-flame">A StreamFlix Original</span>
            </motion.span>

            <motion.h1
              variants={{
                hidden: { opacity: 0, y: 18 },
                show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
              }}
              className="font-display tracking-[0.01em] text-balance text-[clamp(3rem,8vw,6.5rem)] leading-[0.92]"
            >
              Stories that move you.
              <br />
              <span className="text-gradient-flame">Streamed in cinematic clarity.</span>
            </motion.h1>

            <motion.p
              variants={{
                hidden: { opacity: 0, y: 14 },
                show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
              }}
              className="text-lg md:text-xl text-white/75 max-w-xl text-balance"
            >
              Unlimited movies, TV shows, and originals — in 4K HDR, with Dolby Atmos. Watch
              anywhere. Cancel anytime.
            </motion.p>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
              }}
              className="flex flex-wrap gap-3 pt-2"
            >
              <Button asChild size="lg" className="btn-cinema h-12 px-7 text-base" data-testid="button-login">
                <a href="/api/login">
                  <Play className="w-5 h-5 mr-2 fill-current" />
                  Get Started
                </a>
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="h-12 px-7 text-base bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 text-foreground"
                data-testid="button-learn-more"
              >
                <Info className="w-5 h-5 mr-2" />
                Learn More
              </Button>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { duration: 0.8, delay: 0.3 } },
              }}
              className="flex items-center gap-4 pt-6 text-xs text-white/55"
            >
              <span>4K Ultra HD</span>
              <span className="opacity-50">·</span>
              <span>Dolby Vision</span>
              <span className="opacity-50">·</span>
              <span>HDR10+</span>
              <span className="opacity-50">·</span>
              <span>Atmos</span>
            </motion.div>
          </motion.div>
        </div>

        {/* scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 z-20 flex flex-col items-center gap-1 text-[10px] uppercase tracking-[0.3em]">
          <span>Scroll</span>
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="relative border-y border-white/5 bg-black/40 overflow-hidden py-6">
        <div className="flex gap-12 animate-marquee whitespace-nowrap">
          {[...trustLogos, ...trustLogos].map((logo, i) => (
            <span
              key={i}
              className="text-sm font-semibold uppercase tracking-[0.2em] text-white/40"
            >
              {logo}
            </span>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative px-4 md:px-8 lg:px-16 py-20 md:py-28 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Why StreamFlix
          </span>
          <h2 className="font-display text-5xl md:text-6xl tracking-[0.01em]">
            Built for the way you watch.
          </h2>
          <p className="text-base md:text-lg text-muted-foreground text-balance">
            From the couch to the commute, we obsess over every frame, pixel and millisecond — so
            you can just hit play.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent p-6 hover:border-white/15 transition-colors duration-300"
            >
              <div
                className={`absolute inset-x-0 -top-1/2 h-full bg-gradient-to-b ${f.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl`}
              />
              <div className="relative space-y-3">
                <div className="w-11 h-11 grid place-items-center rounded-xl bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 text-primary">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold leading-snug">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SHOWCASE */}
      <section className="relative px-4 md:px-8 lg:px-16 py-20 md:py-28 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Originals
            </span>
            <h2 className="font-display text-5xl md:text-6xl tracking-[0.01em] leading-[0.95]">
              The world's most addictive originals.
            </h2>
            <p className="text-muted-foreground text-balance">
              Awarded productions, breakout hits, and weekly drops curated by our editorial team.
              Cinema-grade craft from the boldest creators on Earth.
            </p>
            <Button className="btn-cinema h-11 px-6 mt-2">
              Browse Originals <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative aspect-[16/10] rounded-2xl overflow-hidden shadow-cinematic"
          >
            <div
              className="absolute inset-0 bg-cover bg-center scale-[1.04]"
              style={{
                backgroundImage:
                  "url('https://picsum.photos/seed/echoes-of-atlas/1600/1000')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-primary font-semibold mb-1">
                  Now Streaming
                </p>
                <h3 className="font-display text-3xl md:text-4xl">Echoes of Atlas</h3>
              </div>
              <div className="w-12 h-12 rounded-full grid place-items-center bg-white text-black hover:scale-110 transition-transform cursor-pointer">
                <Play className="w-5 h-5 fill-black" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative px-4 md:px-8 lg:px-16 py-20 md:py-28 max-w-3xl mx-auto">
        <div className="text-center mb-10 space-y-3">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            FAQ
          </span>
          <h2 className="font-display text-5xl md:text-6xl tracking-[0.01em]">
            Frequently asked
          </h2>
        </div>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((item, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-xl border border-white/8 bg-white/[0.03] data-[state=open]:bg-white/[0.06] backdrop-blur-md px-5 transition-colors"
            >
              <AccordionTrigger className="text-base md:text-lg hover:no-underline py-5 font-semibold">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-10 text-center space-y-4">
          <p className="text-muted-foreground">
            Ready to watch? Sign in and start your journey.
          </p>
          <Button asChild className="btn-cinema h-12 px-8" size="lg">
            <a href="/api/login">
              Get Started <ArrowRight className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
