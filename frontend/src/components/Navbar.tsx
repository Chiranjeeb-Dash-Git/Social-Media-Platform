"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import {
  Home,
  TrendingUp,
  Users,
  Plus,
  Search,
  Bell,
  Moon,
  Sun,
  LogOut,
  User,
  Settings,
} from "lucide-react";
import { useTheme } from "next-themes";

export function Navbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    window.location.href = query ? `/?q=${encodeURIComponent(query)}` : "/";
  };

  const linkClass = (href: string) =>
    `flex items-center space-x-2 text-sm font-medium transition-colors ${
      pathname === href
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center space-x-2" aria-label="Home">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-reddit-orange">
            <span className="text-sm font-bold text-white">R</span>
          </div>
          <span className="hidden font-bold text-gradient sm:inline-block">
            Reddit Clone
          </span>
        </Link>

        <nav className="hidden items-center space-x-5 md:flex">
          <Link href="/" className={linkClass("/")} aria-label="Home">
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>
          <Link
            href="/trending"
            className={linkClass("/trending")}
            aria-label="Trending"
          >
            <TrendingUp className="h-4 w-4" />
            <span>Trending</span>
          </Link>
          <Link
            href="/communities"
            className={linkClass("/communities")}
            aria-label="Communities"
          >
            <Users className="h-4 w-4" />
            <span>Communities</span>
          </Link>
        </nav>

        <div className="min-w-0 flex-1">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search Reddit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-full border border-border bg-muted py-2 pl-10 pr-10 text-sm transition-all duration-200 placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              aria-label="Search"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

        <div className="flex flex-shrink-0 items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8 p-0"
            aria-label="Toggle theme"
          >
            {mounted && theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {user && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 relative"
              onClick={() => toast("You have 3 unread notifications.")}
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="notification-badge">3</span>
            </Button>
          )}

          {!user && (
            <span className="hidden rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground lg:inline-flex">
              Guest mode
            </span>
          )}

          <Button asChild size="sm" className="cinematic-button px-3 sm:px-6">
            <Link href="/submit">
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Create</span>
            </Link>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <Avatar src={user.image} alt={user.username} size="sm" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <Avatar src={user.image} alt={user.username} size="sm" />
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user.username}</p>
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/u/${user.username}`} className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="flex items-center">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center space-x-2 sm:flex">
              <Button variant="ghost" asChild size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm" className="cinematic-button">
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
