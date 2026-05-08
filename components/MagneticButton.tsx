"use client";

import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";
import { useMagnetic } from "@/lib/useMagnetic";
import { cn } from "@/lib/utils";

interface MagneticButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "ghost" | "outline";
  size?: "default" | "lg";
  asChild?: boolean;
}

const variants = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-hover shadow-glow-sm hover:shadow-glow",
  ghost: "bg-white/10 text-foreground hover:bg-white/20 backdrop-blur-md",
  outline: "border border-white/30 text-foreground hover:bg-white/10",
};

const sizes = {
  default: "h-11 px-6 text-sm",
  lg: "h-14 px-9 text-base",
};

export const MagneticButton = forwardRef<HTMLButtonElement, MagneticButtonProps>(
  ({ children, variant = "primary", size = "default", className, ...props }, _outerRef) => {
    const ref = useMagnetic<HTMLButtonElement>({ strength: 0.3, range: 80 });

    return (
      <button
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center gap-2 font-semibold uppercase tracking-[0.18em] rounded-full transition-colors duration-300 ease-cinema will-change-transform overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </button>
    );
  },
);
MagneticButton.displayName = "MagneticButton";
