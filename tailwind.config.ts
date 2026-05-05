import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: ".5625rem", /* 9px */
        md: ".375rem", /* 6px */
        sm: ".1875rem", /* 3px */
      },
      colors: {
        // Flat / base colors (regular buttons)
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
          border: "hsl(var(--card-border) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
          border: "hsl(var(--popover-border) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          border: "var(--primary-border)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
          border: "var(--secondary-border)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
          border: "var(--muted-border)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          border: "var(--accent-border)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
          border: "var(--destructive-border)",
        },
        ring: "hsl(var(--ring) / <alpha-value>)",
        chart: {
          "1": "hsl(var(--chart-1) / <alpha-value>)",
          "2": "hsl(var(--chart-2) / <alpha-value>)",
          "3": "hsl(var(--chart-3) / <alpha-value>)",
          "4": "hsl(var(--chart-4) / <alpha-value>)",
          "5": "hsl(var(--chart-5) / <alpha-value>)",
        },
        sidebar: {
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
          DEFAULT: "hsl(var(--sidebar) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
        },
        "sidebar-primary": {
          DEFAULT: "hsl(var(--sidebar-primary) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          border: "var(--sidebar-primary-border)",
        },
        "sidebar-accent": {
          DEFAULT: "hsl(var(--sidebar-accent) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "var(--sidebar-accent-border)"
        },
        status: {
          online: "rgb(34 197 94)",
          away: "rgb(245 158 11)",
          busy: "rgb(239 68 68)",
          offline: "rgb(156 163 175)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
      transitionTimingFunction: {
        cinema: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(229,9,20,0.35), 0 10px 40px -10px rgba(229,9,20,0.55)",
        "glow-sm": "0 8px 20px -8px rgba(229,9,20,0.55)",
        "glow-lg": "0 0 0 1px rgba(229,9,20,0.45), 0 24px 80px -16px rgba(229,9,20,0.7)",
        cinematic: "0 30px 60px -20px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.06)",
        card: "0 12px 32px -12px rgba(0,0,0,0.85)",
      },
      backgroundImage: {
        "hero-scrim":
          "linear-gradient(180deg, rgba(8,9,12,0) 0%, rgba(8,9,12,0.25) 35%, rgba(8,9,12,0.85) 80%, hsl(var(--background)) 100%)",
        "hero-scrim-side":
          "linear-gradient(90deg, rgba(8,9,12,0.95) 0%, rgba(8,9,12,0.65) 35%, rgba(8,9,12,0) 70%)",
        "radial-fade":
          "radial-gradient(120% 80% at 50% 0%, rgba(229,9,20,0.18) 0%, rgba(8,9,12,0) 60%)",
        "red-gradient":
          "linear-gradient(135deg, #E50914 0%, #B0060F 100%)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        kenburns: {
          "0%": { transform: "scale(1.05) translate3d(0,0,0)" },
          "100%": { transform: "scale(1.18) translate3d(-1.5%,-1%,0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(229,9,20,0.55)" },
          "50%": { boxShadow: "0 0 0 12px rgba(229,9,20,0)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "marquee-line": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(400%)" },
        },
        "spotlight-sweep": {
          "0%": { transform: "translateX(-100%) skewX(-20deg)", opacity: "0" },
          "30%": { opacity: "0.6" },
          "100%": { transform: "translateX(220%) skewX(-20deg)", opacity: "0" },
        },
        "tilt-in": {
          "0%": { opacity: "0", transform: "perspective(1200px) rotateX(8deg) translateY(40px)" },
          "100%": { opacity: "1", transform: "perspective(1200px) rotateX(0) translateY(0)" },
        },
        "letter-reveal": {
          "0%": { transform: "translateY(110%)" },
          "100%": { transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        kenburns: "kenburns 18s ease-out forwards",
        shimmer: "shimmer 1.6s linear infinite",
        "glow-pulse": "glow-pulse 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite",
        "fade-up": "fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        marquee: "marquee 40s linear infinite",
        "marquee-line": "marquee-line 1.4s cubic-bezier(0.65, 0, 0.35, 1) infinite",
        "spotlight-sweep": "spotlight-sweep 3.6s ease-in-out infinite",
        "tilt-in": "tilt-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) both",
        "letter-reveal": "letter-reveal 0.9s cubic-bezier(0.22, 1, 0.36, 1) both",
        float: "float 6s cubic-bezier(0.42, 0, 0.58, 1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
