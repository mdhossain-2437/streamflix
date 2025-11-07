import { Link, useLocation } from "wouter";
import { Search, Bell, User as UserIcon } from "lucide-react";
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
import { useState } from "react";

export function Navbar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/movies", label: "Movies" },
    { path: "/series", label: "TV Shows" },
    { path: "/watchlist", label: "My List" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-colors duration-300">
      <div className="absolute inset-0 bg-gradient-to-b from-background/95 to-background/0" />
      <div className="relative px-4 md:px-8 lg:px-16">
        <div className="flex items-center justify-between h-16 md:h-20">
          <div className="flex items-center gap-8">
            <Link href="/">
              <a className="flex items-center" data-testid="link-home">
                <span className="text-primary text-2xl md:text-3xl font-bold">StreamFlix</span>
              </a>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link key={link.path} href={link.path}>
                  <a
                    className={`text-sm font-medium transition-colors hover:text-foreground ${
                      location === link.path ? "text-foreground" : "text-muted-foreground"
                    }`}
                    data-testid={`link-nav-${link.label.toLowerCase().replace(" ", "-")}`}
                  >
                    {link.label}
                  </a>
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {searchOpen ? (
              <div className="flex items-center gap-2">
                <Input
                  type="search"
                  placeholder="Search..."
                  className="w-64 bg-card/50 backdrop-blur-md border-border"
                  autoFocus
                  data-testid="input-search"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchOpen(false)}
                  data-testid="button-close-search"
                >
                  <Search className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                data-testid="button-open-search"
              >
                <Search className="w-5 h-5" />
              </Button>
            )}

            <Button variant="ghost" size="icon" data-testid="button-notifications">
              <Bell className="w-5 h-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-md"
                  data-testid="button-user-menu"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
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
