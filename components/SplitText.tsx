"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  /** When to start the reveal: 'mount' fires immediately, 'view' on entering viewport. */
  trigger?: "mount" | "view";
}

// Editorial split-text reveal — each character fades and slides up with a
// staggered delay. We avoid a clipping mask so the text remains readable
// even if an animation library / IO bug delays the trigger.
export function SplitText({
  text,
  className = "",
  delay = 0,
  stagger = 0.025,
  duration = 0.8,
  as: Tag = "span",
  trigger = "mount",
}: SplitTextProps) {
  const id = useId();
  const reduced = useReducedMotion();
  const words = text.split(/(\s+)/);

  if (reduced) {
    return <Tag className={className}>{text}</Tag>;
  }

  const animateProps =
    trigger === "view"
      ? {
          initial: { opacity: 0, y: 28 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.15 },
        }
      : {
          initial: { opacity: 0, y: 28 },
          animate: { opacity: 1, y: 0 },
        };

  return (
    <Tag className={className} aria-label={text}>
      {words.map((word, wIdx) => {
        if (/^\s+$/.test(word)) {
          return <span key={`${id}-w-${wIdx}`}>{word}</span>;
        }
        return (
          <span
            key={`${id}-w-${wIdx}`}
            className="inline-block"
            aria-hidden="true"
          >
            {Array.from(word).map((char, cIdx) => (
              <motion.span
                key={`${id}-w-${wIdx}-c-${cIdx}`}
                className="inline-block will-change-transform"
                {...animateProps}
                transition={{
                  duration,
                  delay: delay + (wIdx * 5 + cIdx) * stagger,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {char}
              </motion.span>
            ))}
          </span>
        );
      })}
    </Tag>
  );
}
