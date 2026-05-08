"use client";

import { useEffect, useRef, useState } from "react";

const HOVER_SELECTOR =
  "a, button, [role='button'], [data-cursor='hover'], input, textarea, select, [data-testid^='card-content']";

const PLAY_SELECTOR = "[data-cursor='play']";

export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (!isFinePointer) return;
    setEnabled(true);

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate3d(${mouseX - 4}px, ${mouseY - 4}px, 0)`;
    };

    const tick = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.transform = `translate3d(${ringX - 16}px, ${ringY - 16}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    let raf = requestAnimationFrame(tick);

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const playEl = target.closest(PLAY_SELECTOR);
      const hoverEl = target.closest(HOVER_SELECTOR);
      if (playEl) {
        ring.dataset.state = "play";
        if (labelRef.current) labelRef.current.textContent = "Play";
      } else if (hoverEl) {
        ring.dataset.state = "hover";
      } else {
        ring.dataset.state = "idle";
      }
    };

    const onDown = () => (ring.dataset.pressed = "1");
    const onUp = () => delete ring.dataset.pressed;

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[1000] h-2 w-2 rounded-full bg-white mix-blend-difference will-change-transform"
      />
      <div
        ref={ringRef}
        aria-hidden="true"
        data-state="idle"
        className="cursor-ring pointer-events-none fixed left-0 top-0 z-[999] h-8 w-8 rounded-full border border-white/60 mix-blend-difference will-change-transform transition-[width,height,background-color,border-color] duration-200 ease-out"
      >
        <span
          ref={labelRef}
          className="absolute inset-0 grid place-items-center text-[10px] font-bold uppercase tracking-[0.2em] text-white opacity-0"
        />
      </div>
    </>
  );
}
