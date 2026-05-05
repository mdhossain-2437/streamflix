import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Play,
  ArrowRight,
  ChevronRight,
  Plus,
  Minus,
  Sparkles,
  Star,
  Globe2,
  Tv,
  Film,
  Headphones,
  Award,
  Zap,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Footer } from "@/components/Footer";
import { SplitText } from "@/components/SplitText";

// Three.js + R3F is heavy (~700kB) — code-split so it only ships when
// the Landing page actually mounts and only on capable devices.
const ShaderHero = lazy(() =>
  import("@/components/ShaderHero").then((m) => ({ default: m.ShaderHero })),
);
import { useScramble } from "@/lib/useScramble";

// Defer the WebGL hero until the browser is idle so the initial paint is
// not blocked by ~700kB of Three.js + R3F. The CSS gradient backdrop covers
// the visual until the shader streams in. Skips entirely on slow connections
// or coarse-pointer devices.
function useDeferredShaderHero() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData) return;
    if (conn?.effectiveType && /(^|-)2g$/.test(conn.effectiveType)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    if (typeof ric === "function") {
      const id = ric(() => setReady(true), { timeout: 1500 });
      return () => {
        const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
        if (typeof cic === "function") cic(id);
      };
    }
    const t = window.setTimeout(() => setReady(true), 600);
    return () => window.clearTimeout(t);
  }, []);
  return ready;
}

gsap.registerPlugin(ScrollTrigger);

const FAQ_ITEMS = [
  {
    q: "What is StreamFlix?",
    a: "An award-winning streaming experience for award-winning stories. Original films, prestige series, documentaries, and live drops — engineered for uncompromising image and sound on every screen.",
  },
  {
    q: "How much does it cost?",
    a: "Plans start at $9.99 / month for HD on two screens, $14.99 / month for 4K HDR on four screens, and $19.99 / month for our IMAX-Enhanced tier with Dolby Atmos. Annual plans save up to 20%.",
  },
  {
    q: "Where can I watch?",
    a: "Web, iOS, Android, Apple TV, Fire TV, Roku, Chromecast, Samsung & LG smart TVs, PS5, Xbox Series, Vision Pro, and Meta Quest. Up to 6 device profiles, offline downloads on mobile.",
  },
  {
    q: "How do I cancel?",
    a: "One click. No phone calls, no retention scripts, no tricks — cancel from your account page and you keep access until the end of the billing period.",
  },
  {
    q: "Is my data safe?",
    a: "End-to-end encryption on payment, granular privacy controls per profile, GDPR + CCPA compliant, SOC 2 Type II audited. We don't sell your viewing data — ever.",
  },
];

const STATS = [
  { value: "12K+", label: "Titles" },
  { value: "120", label: "Countries" },
  { value: "4K HDR", label: "Dolby Vision" },
  { value: "Atmos", label: "Spatial Audio" },
];

const FEATURES = [
  {
    icon: Film,
    title: "Studio originals",
    body: "Greenlit, produced, and shipped exclusively on StreamFlix. Cannes-grade colorists, Academy-grade scripts.",
  },
  {
    icon: Tv,
    title: "Every screen",
    body: "Pixel-perfect on a phone, IMAX on your TV. ProRes-grade codecs adapt in real time to your bandwidth and device.",
  },
  {
    icon: Headphones,
    title: "Spatial sound",
    body: "Dolby Atmos object audio on supported gear. Lossless 24-bit master mixes the way the director cut them.",
  },
  {
    icon: Globe2,
    title: "120 countries",
    body: "Localized in 38 languages with director-approved dubs and SDH captions. Your library, anywhere.",
  },
  {
    icon: Zap,
    title: "Instant resume",
    body: "Sub-second TTFB to playback, predictive prefetching, and a player engineered for zero-buffer transitions.",
  },
  {
    icon: Shield,
    title: "Private by design",
    body: "End-to-end encrypted payments, profile-level privacy, GDPR + CCPA compliant. Your watch history is yours.",
  },
];

const SHOWCASE = [
  {
    kicker: "Studio Original",
    title: "Echoes of Atlas",
    body: "A cartographer discovers a chart of a city that doesn't exist — until people start vanishing into it.",
    image: "https://picsum.photos/seed/atlas-feature/1600/1000",
  },
  {
    kicker: "Limited Series",
    title: "Crimson Skyline",
    body: "Six nights. One penthouse. A whisper network of architects, oligarchs, and the woman who built them.",
    image: "https://picsum.photos/seed/crimson-feature/1600/1000",
  },
  {
    kicker: "Documentary",
    title: "Neon Prelude",
    body: "Inside the lost demoscene that taught Hollywood how to render 24fps light.",
    image: "https://picsum.photos/seed/neon-feature/1600/1000",
  },
];

const MARQUEE_PHRASES = [
  "Cinematic by design",
  "Mastered in 4K HDR",
  "Spatial audio",
  "Award-winning originals",
  "Engineered for every screen",
  "120 countries · 38 languages",
];

export default function Landing() {
  const heroRef = useRef<HTMLElement>(null);
  const showcaseRef = useRef<HTMLElement>(null);
  const sotdRef = useScramble<HTMLSpanElement>("Site of the Day · 2026", {
    trigger: "view",
  });
  const shaderReady = useDeferredShaderHero();

  // Hero parallax — title sinks slightly, shader hero zooms out as you scroll.
  const { scrollY } = useScroll();
  const titleY = useTransform(scrollY, [0, 600], [0, 90]);
  const shaderScale = useTransform(scrollY, [0, 600], [1, 1.18]);
  const shaderOpacity = useTransform(scrollY, [0, 600], [1, 0.45]);

  // Pinned showcase storytelling — each panel locks in for a beat.
  useEffect(() => {
    if (!showcaseRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const panels = gsap.utils.toArray<HTMLElement>(".showcase-panel");
      panels.forEach((panel, i) => {
        gsap.fromTo(
          panel.querySelector(".showcase-image"),
          { scale: 1.05, yPercent: 8 },
          {
            scale: 1,
            yPercent: -8,
            ease: "none",
            scrollTrigger: {
              trigger: panel,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.1,
            },
          },
        );
        gsap.fromTo(
          panel.querySelector(".showcase-copy"),
          { opacity: 0, y: 60 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: {
              trigger: panel,
              start: "top 70%",
              end: "top 30%",
              toggleActions: "play none none reverse",
            },
          },
        );
        if (i > 0) {
          gsap.fromTo(
            panel,
            { clipPath: "inset(8% 8% 8% 8% round 24px)" },
            {
              clipPath: "inset(0% 0% 0% 0% round 0px)",
              scrollTrigger: {
                trigger: panel,
                start: "top bottom",
                end: "top center",
                scrub: 1,
              },
            },
          );
        }
      });
    }, showcaseRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* TOP BAR */}
      <header className="fixed top-0 inset-x-0 z-40 backdrop-blur-md bg-background/30 border-b border-white/[0.06]">
        <div className="mx-auto max-w-[1600px] px-6 md:px-10 h-16 flex items-center justify-between">
          <a href="/" className="font-display text-2xl tracking-[0.04em]">
            STREAM<span className="text-primary">FLIX</span>
          </a>
          <nav className="hidden md:flex items-center gap-7 text-sm">
            <a className="link-magnetic text-foreground/80 hover:text-foreground" href="#originals">Originals</a>
            <a className="link-magnetic text-foreground/80 hover:text-foreground" href="#features">Features</a>
            <a className="link-magnetic text-foreground/80 hover:text-foreground" href="#faq">FAQ</a>
          </nav>
          <Button
            asChild
            className="rounded-full h-9 px-5 bg-primary text-primary-foreground hover:bg-primary-hover font-semibold uppercase tracking-[0.18em] text-xs shadow-glow-sm hover:shadow-glow"
            data-testid="button-signin-nav"
          >
            <a href="/api/login">Sign in</a>
          </Button>
        </div>
      </header>

      {/* HERO */}
      <section
        ref={heroRef}
        className="relative min-h-[100svh] flex flex-col justify-end overflow-hidden noise-overlay"
      >
        <motion.div
          style={{ scale: shaderScale, opacity: shaderOpacity }}
          className="absolute inset-0"
        >
          {shaderReady ? (
            <Suspense
              fallback={
                <div className="absolute inset-0 bg-gradient-to-br from-[#0b0c10] via-[#7c0a14] to-[#ff3344] opacity-70" />
              }
            >
              <ShaderHero intensity={1.0} />
            </Suspense>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#0b0c10] via-[#7c0a14] to-[#ff3344] opacity-70" />
          )}
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_120%,rgba(229,9,20,0.35),transparent_60%)] mix-blend-screen" />

        {/* Top floating eyebrow */}
        <div className="absolute top-24 inset-x-0 z-10">
          <div className="mx-auto max-w-[1600px] px-6 md:px-10 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.3em] text-foreground/70">
            <div className="flex items-center gap-3">
              <Award className="w-4 h-4 text-primary" />
              <span ref={sotdRef}>Site of the Day · 2026</span>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <span className="h-px w-8 bg-foreground/40" />
              <span>v3.0 — Cinema Engine</span>
            </div>
          </div>
        </div>

        {/* Hero copy */}
        <motion.div
          style={{ y: titleY }}
          className="relative z-10 mx-auto max-w-[1600px] w-full px-6 md:px-10 pb-20 md:pb-28"
        >
          <div className="max-w-[1100px]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 mb-5 text-[11px] font-bold uppercase tracking-[0.3em] text-primary"
            >
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-glow-pulse" />
              <Sparkles className="w-3.5 h-3.5" />
              The streaming engine, reimagined
            </motion.div>

            <h1 className="display-lockup">
              <SplitText text="Stories" delay={0.05} className="block" />
              <span className="block">
                <SplitText
                  text="that pull"
                  delay={0.25}
                  className="text-stroke"
                />{" "}
                <SplitText text="you in." delay={0.45} className="text-primary" />
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 max-w-2xl text-lg md:text-xl text-foreground/80 leading-relaxed"
            >
              Award-winning originals, blockbuster cinema, and prestige series — mastered in 4K HDR
              with Dolby Atmos, served sub-second to every screen you own.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <Button
                asChild
                size="lg"
                className="rounded-full h-14 px-9 text-sm font-bold uppercase tracking-[0.2em] bg-primary text-primary-foreground hover:bg-primary-hover shadow-glow hover:shadow-glow-lg transition-shadow group"
                data-testid="button-login"
              >
                <a href="/api/login">
                  Start watching
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full h-14 px-8 text-sm font-bold uppercase tracking-[0.2em] border border-white/30 bg-white/5 backdrop-blur-md hover:bg-white/15"
                data-testid="button-learn-more"
                onClick={() => {
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <Play className="mr-2 w-4 h-4 fill-current" />
                Watch the trailer
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Bottom stats rail */}
        <div className="relative z-10 border-t border-white/[0.08] bg-background/60 backdrop-blur-md">
          <div className="mx-auto max-w-[1600px] px-6 md:px-10 py-5 grid grid-cols-2 md:grid-cols-4 gap-y-4">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.6 }}
                className="flex items-baseline gap-3 md:flex-col md:gap-1"
              >
                <div className="font-display text-2xl md:text-3xl tracking-[0.02em]">
                  {s.value}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-foreground/55">
                  {s.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* MARQUEE BAND */}
      <div
        className="relative border-b border-white/[0.06] py-6 overflow-hidden"
        aria-hidden="true"
      >
        <div className="flex gap-12 whitespace-nowrap animate-marquee will-change-transform">
          {[...MARQUEE_PHRASES, ...MARQUEE_PHRASES].map((phrase, i) => (
            <div key={i} className="flex items-center gap-12 text-foreground/60">
              <span className="font-display text-3xl md:text-5xl uppercase tracking-[0.04em]">
                {phrase}
              </span>
              <Star className="w-3 h-3 fill-primary text-primary" />
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" className="relative py-28 md:py-40">
        <div className="mx-auto max-w-[1600px] px-6 md:px-10">
          <div className="mb-16 md:mb-24 grid md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-3 text-[11px] font-bold uppercase tracking-[0.3em] text-foreground/55">
              <span className="inline-block h-px w-10 bg-primary align-middle mr-3" />
              Engineered details
            </div>
            <h2 className="md:col-span-9 font-display text-[clamp(2.5rem,7vw,7rem)] leading-[0.92] tracking-[-0.01em] uppercase">
              <SplitText text="A platform" trigger="view" /> {" "}
              <SplitText text="built for" delay={0.1} trigger="view" className="text-stroke-thin" />{" "}
              <SplitText text="cinema" delay={0.2} trigger="view" className="text-primary" />.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.06] border border-white/[0.06] rounded-3xl overflow-hidden">
            {FEATURES.map((f, i) => (
              <motion.article
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-15%" }}
                transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="group relative bg-background hover:bg-white/[0.02] p-8 md:p-10 transition-colors duration-500"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/[0.06] group-hover:to-transparent transition-all duration-700 pointer-events-none" />
                <div className="relative">
                  <div className="mb-8 flex items-center justify-between">
                    <span className="font-display text-xs tracking-[0.3em] text-foreground/40">
                      0{i + 1}
                    </span>
                    <f.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display text-2xl md:text-3xl uppercase tracking-[0.02em] mb-3">
                    {f.title}
                  </h3>
                  <p className="text-foreground/70 leading-relaxed">
                    {f.body}
                  </p>
                  <div className="mt-8 h-px w-12 bg-foreground/20 group-hover:w-24 group-hover:bg-primary transition-all duration-700 ease-cinema" />
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* PINNED SHOWCASE */}
      <section ref={showcaseRef} id="originals" className="relative">
        <div className="mx-auto max-w-[1600px] px-6 md:px-10 py-12 md:py-16 grid md:grid-cols-12 gap-8 items-end">
          <div className="md:col-span-3 text-[11px] font-bold uppercase tracking-[0.3em] text-foreground/55">
            <span className="inline-block h-px w-10 bg-primary align-middle mr-3" />
            Studio originals
          </div>
          <h2 className="md:col-span-9 font-display text-[clamp(2.5rem,7vw,7rem)] leading-[0.92] tracking-[-0.01em] uppercase">
            <SplitText text="Stories you" trigger="view" /> {" "}
            <SplitText text="won't find" delay={0.1} trigger="view" />{" "}
            <SplitText text="anywhere else" delay={0.2} trigger="view" className="text-primary" />.
          </h2>
        </div>

        {SHOWCASE.map((s, i) => (
          <article
            key={s.title}
            className="showcase-panel relative h-[100svh] grid place-items-center overflow-hidden"
          >
            <div
              className="showcase-image absolute inset-0 bg-cover bg-center will-change-transform"
              style={{ backgroundImage: `url(${s.image})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/40" />

            <div className="relative z-10 mx-auto max-w-[1600px] w-full px-6 md:px-10 grid md:grid-cols-12 items-end pb-20">
              <div className="showcase-copy md:col-span-7">
                <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary mb-4">
                  Episode 0{i + 1} · {s.kicker}
                </div>
                <h3 className="font-display uppercase text-[clamp(3rem,11vw,11rem)] leading-[0.85] tracking-[-0.01em] mb-6">
                  {s.title}
                </h3>
                <p className="max-w-xl text-base md:text-lg text-foreground/85 mb-8 leading-relaxed">
                  {s.body}
                </p>
                <Button
                  asChild
                  className="rounded-full h-12 px-7 bg-white text-black hover:bg-white/90 text-sm font-bold uppercase tracking-[0.2em] group"
                >
                  <a href="/api/login">
                    Watch trailer
                    <ChevronRight className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
              </div>
              <div className="md:col-span-5 hidden md:flex justify-end">
                <div className="font-display text-[14rem] leading-none text-stroke-thin opacity-50">
                  0{i + 1}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* FAQ */}
      <section id="faq" className="relative py-28 md:py-40">
        <div className="mx-auto max-w-[1100px] px-6 md:px-10">
          <div className="mb-16 text-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-foreground/55 mb-6">
              <span className="inline-block h-px w-10 bg-primary align-middle mr-3" />
              Questions, answered
              <span className="inline-block h-px w-10 bg-primary align-middle ml-3" />
            </div>
            <h2 className="font-display text-[clamp(2.5rem,7vw,6rem)] leading-[0.92] uppercase">
              <SplitText text="Everything" trigger="view" /> <SplitText text="you'd ask." delay={0.1} trigger="view" className="text-primary" />
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border border-white/10 rounded-2xl bg-white/[0.02] data-[state=open]:bg-white/[0.04] backdrop-blur-md overflow-hidden transition-colors"
              >
                <AccordionTrigger className="px-6 md:px-8 py-5 text-left text-base md:text-lg font-medium hover:no-underline group [&[data-state=open]>svg]:hidden">
                  <span className="flex items-center gap-4 flex-1">
                    <span className="font-display text-xs tracking-[0.3em] text-foreground/40 group-data-[state=open]:text-primary">
                      0{i + 1}
                    </span>
                    {item.q}
                  </span>
                  <span className="ml-4 inline-grid place-items-center w-9 h-9 rounded-full border border-white/20 group-data-[state=open]:rotate-45 transition-transform duration-500">
                    <Plus className="w-4 h-4 group-data-[state=open]:hidden" />
                    <Minus className="w-4 h-4 hidden group-data-[state=open]:block" />
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-6 md:px-8 pb-6 text-foreground/75 leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-20 grid place-items-center">
            <div className="text-center max-w-2xl">
              <h3 className="font-display text-[clamp(2rem,4.5vw,4rem)] uppercase leading-[0.95] mb-6">
                Ready when <br />
                <span className="text-primary">you are.</span>
              </h3>
              <p className="text-foreground/70 mb-8">
                Two-minute sign-up. Cancel any time. No catches, no upsells, no awkward retention calls.
              </p>
              <Button
                asChild
                size="lg"
                className="rounded-full h-14 px-10 bg-primary text-primary-foreground hover:bg-primary-hover text-sm font-bold uppercase tracking-[0.2em] shadow-glow hover:shadow-glow-lg transition-shadow group"
              >
                <a href="/api/login">
                  Start watching
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
