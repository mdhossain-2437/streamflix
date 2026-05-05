import { Link, useLocation } from "wouter";
import { Search, Bell, User as UserIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";

export function Navbar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/movies", label: "Movies" },
    { path: "/series", label: "TV Shows" },
    { path: "/watchlist", label: "My List" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-[background,backdrop-filter,border] duration-500 ease-cinema ${
        scrolled
          ? "glass-strong shadow-cinematic"
          : "bg-gradient-to-b from-background/85 via-background/40 to-transparent"
      }`}
      data-testid="navbar"
    >
      <div className="px-4 md:px-8 lg:px-16">
        <div className="flex items-center justify-between h-16 md:h-20">
          <div className="flex items-center gap-10">
            <Link href="/">
              <a className="flex items-center group" data-testid="link-home">
                <span className="font-display tracking-[0.04em] text-3xl md:text-4xl text-primary drop-shadow-[0_2px_12px_rgba(229,9,20,0.45)] transition-transform duration-300 ease-cinema group-hover:scale-[1.04]">
                  STREAM<span className="text-foreground">FLIX</span>
                </span>
              </a>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const active = location === link.path;
                return (
                  <Link key={link.path} href={link.path}>
                    <a
                      className={`relative px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                        active
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      data-testid={`link-nav-${link.label
                        .toLowerCase()
                        .replace(" ", "-")}`}
                    >
                      {link.label}
                      {active && (
                        <motion.span
                          layoutId="nav-underline"
                          className="absolute left-3 right-3 -bottom-0.5 h-[2px] rounded-full bg-gradient-to-r from-primary via-rose-400 to-primary"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </a>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <AnimatePresence initial={false} mode="wait">
              {searchOpen ? (
                <motion.div
                  key="search-open"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 280, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-1"
                >
                  <Input
                    type="search"
                    placeholder="Titles, people, genres"
                    className="h-9 w-full bg-card/70 backdrop-blur-md border-white/10 focus-visible:ring-primary/50"
                    autoFocus
                    data-testid="input-search"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setSearchOpen(false)}
                    data-testid="button-close-search"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="search-closed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-white/5"
                    onClick={() => setSearchOpen(true)}
                    data-testid="button-open-search"
                  >
                    <Search className="w-5 h-5" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:bg-white/5 relative"
              data-testid="button-notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--background))]" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-md p-0"
                  data-testid="button-user-menu"
                >
                  <Avatar className="w-8 h-8 ring-2 ring-transparent hover:ring-primary/60 transition-shadow duration-200">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-rose-700 text-primary-foreground text-xs font-semibold">
                      {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 glass">
                <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                  My Account
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/profile">
                  <DropdownMenuItem data-testid="menu-item-profile">
                    <UserIcon className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/api/logout" data-testid="menu-item-logout">
                    Log Out
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
