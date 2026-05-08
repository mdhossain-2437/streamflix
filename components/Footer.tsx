import Link from "next/link";
import { Github, Twitter, Instagram, Youtube, Globe } from "lucide-react";

const sections = [
  {
    title: "Browse",
    links: [
      { label: "Home", href: "/home" },
      { label: "Movies", href: "/movies" },
      { label: "TV Shows", href: "/series" },
      { label: "My List", href: "/watchlist" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Help Center", href: "#" },
      { label: "Account", href: "/profile" },
      { label: "Supported Devices", href: "#" },
      { label: "Accessibility", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Press", href: "#" },
      { label: "Investor Relations", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Use", href: "#" },
      { label: "Privacy", href: "#" },
      { label: "Cookie Preferences", href: "#" },
      { label: "Corporate Information", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer
      className="relative border-t border-white/5 bg-gradient-to-b from-background to-black/80 mt-12"
      data-testid="footer"
    >
      <div className="px-4 md:px-8 lg:px-16 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12">
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link
              href="/home"
              className="inline-flex items-center"
              data-testid="link-footer-home"
            >
              <span className="font-display tracking-[0.04em] text-3xl text-primary drop-shadow-[0_2px_12px_rgba(229,9,20,0.45)]">
                STREAM<span className="text-foreground">FLIX</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Cinematic streaming, reimagined. Watch anywhere. Cancel anytime.
            </p>
            <div className="flex items-center gap-3 pt-2">
              {[Twitter, Instagram, Youtube, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 grid place-items-center rounded-full bg-white/5 hover:bg-primary/90 hover:text-primary-foreground transition-colors duration-300"
                  aria-label="social"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {sections.map((section) => (
            <div key={section.title} className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {section.title}
              </h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("#") ? (
                      <a
                        href={link.href}
                        className="text-sm text-foreground/80 hover:text-primary transition-colors duration-200"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-foreground/80 hover:text-primary transition-colors duration-200"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Globe className="w-4 h-4" />
            <span>English</span>
            <span className="opacity-50">·</span>
            <span>© {new Date().getFullYear()} StreamFlix, Inc.</span>
          </div>
          <p className="text-xs text-muted-foreground/70">
            Service Code 1138 · Built with cinematic care.
          </p>
        </div>
      </div>
    </footer>
  );
}
