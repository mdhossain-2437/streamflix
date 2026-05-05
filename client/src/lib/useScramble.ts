import { useEffect, useRef } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*+/<>?";

interface Options {
  speed?: number;
  duration?: number;
  trigger?: "mount" | "hover" | "view";
}

// Scramble-text reveal — each character flickers through a random pool before
// resolving to the final glyph. Optionally triggered on view (IntersectionObserver)
// or hover. Honors prefers-reduced-motion.
export function useScramble<T extends HTMLElement>(
  finalText: string,
  { speed = 1.4, duration = 800, trigger = "view" }: Options = {},
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = finalText;
      return;
    }

    let raf = 0;
    let cancelled = false;

    const run = () => {
      cancelled = false;
      const start = performance.now();
      const len = finalText.length;
      const tick = (now: number) => {
        if (cancelled) return;
        const t = Math.min(1, (now - start) / duration);
        const reveal = Math.floor(t * len * speed);
        let out = "";
        for (let i = 0; i < len; i++) {
          if (i < reveal) {
            out += finalText[i];
          } else if (finalText[i] === " ") {
            out += " ";
          } else {
            out += CHARS[Math.floor(Math.random() * CHARS.length)];
          }
        }
        el.textContent = out;
        if (t < 1) raf = requestAnimationFrame(tick);
        else el.textContent = finalText;
      };
      raf = requestAnimationFrame(tick);
    };

    const cancel = () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };

    if (trigger === "mount") {
      el.textContent = finalText;
      run();
    } else if (trigger === "hover") {
      el.textContent = finalText;
      el.addEventListener("mouseenter", run);
      el.addEventListener("mouseleave", () => {
        cancel();
        el.textContent = finalText;
      });
    } else {
      el.textContent = finalText;
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              run();
              io.unobserve(el);
            }
          });
        },
        { threshold: 0.4 },
      );
      io.observe(el);
      return () => {
        io.disconnect();
        cancel();
      };
    }

    return cancel;
  }, [finalText, speed, duration, trigger]);

  return ref;
}
