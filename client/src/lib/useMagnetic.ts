import { useEffect, useRef } from "react";

interface Options {
  strength?: number;
  range?: number;
}

// Magnetic CTA effect — element pulls toward the cursor when within range,
// with eased return on leave. Disabled on coarse pointers.
export function useMagnetic<T extends HTMLElement>({
  strength = 0.35,
  range = 120,
}: Options = {}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let inRange = false;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < rect.width / 2 + range) {
        inRange = true;
        targetX = dx * strength;
        targetY = dy * strength;
      } else if (inRange) {
        inRange = false;
        targetX = 0;
        targetY = 0;
      }
    };

    const tick = () => {
      curX += (targetX - curX) * 0.18;
      curY += (targetY - curY) * 0.18;
      el.style.transform = `translate3d(${curX}px, ${curY}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    raf = requestAnimationFrame(tick);
    window.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [strength, range]);

  return ref;
}
