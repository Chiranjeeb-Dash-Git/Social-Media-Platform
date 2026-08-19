"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
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
  Moon,
  Sun,
  LogOut,
  User,
  Settings,
  ShoppingBag,
  Tv,
  ShieldAlert,
  Loader2,
  FileText
} from "lucide-react";
import { useTheme } from "next-themes";
import { NotificationDropdown } from "@/components/NotificationDropdown";

export function Navbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    users: any[]; posts: any[]; communities: any[]; pages: any[]; marketplace: any[];
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await axios.get(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      setSearchResults(null);
      router.push(`/?q=${encodeURIComponent(query)}`);
    }
  };

  const linkClass = (href: string) =>
    `flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
      pathname === href
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#123b21]/10 bg-[#fffdf5]/75 shadow-[0_4px_24px_rgba(18,59,33,.06)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#08090e]/75 dark:shadow-[0_12px_32px_rgba(0,0,0,.35)]">
      <div className="flex h-14 w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Left: Logo & Search */}
        <div className="flex items-center gap-3 min-w-0 flex-1 max-w-sm">
          <Link href="/" className="flex items-center space-x-2 flex-shrink-0" aria-label="Home">
              <div className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-gradient-to-br from-[#2f7a4a] to-[#123b21] shadow-md dark:from-[#3b6eff] dark:to-[#274ecf] dark:shadow-[0_0_22px_rgba(59,110,255,.55)]">
                <span className="text-lg font-black text-[#eafbe4]">S</span>
              </div>
            <span className="hidden bg-gradient-to-r from-[#123b21] to-[#2f7a4a] bg-clip-text text-base font-extrabold tracking-tight text-transparent dark:from-[#ff7a3d] dark:via-[#9b5cff] dark:to-[#3b6eff] sm:inline-block">
              SocialPulse
            </span>
          </Link>

          <div className="relative flex-1 min-w-0" ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search SocialPulse..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchQuery.trim()) setSearchQuery(searchQuery); }}
                className="h-9 w-full rounded-full border border-border bg-muted/70 py-1.5 pl-9 pr-8 text-xs transition-all duration-200 placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-white/[0.04] dark:focus:bg-white/[0.06] sm:text-sm"
              />
              {isSearching ? (
                <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); setSearchResults(null); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </form>

            {/* Universal Search Live Dropdown */}
            {searchResults && (
              <div className="absolute left-0 right-0 top-11 bg-card border rounded-2xl shadow-2xl p-2 max-h-[80vh] overflow-y-auto z-50 divide-y divide-border/50 animate-in fade-in-50 duration-150">
                {searchResults.users.length > 0 && (
                  <div className="py-2 first:pt-0">
                    <span className="text-[10px] font-bold text-muted-foreground px-2 uppercase tracking-wider">People</span>
                    {searchResults.users.slice(0, 3).map((u: any) => (
                      <Link key={u.id} href={`/u/${u.username}`} onClick={() => setSearchResults(null)} className="flex items-center gap-2 p-2 hover:bg-muted rounded-xl transition-colors">
                        <Avatar src={u.image} alt={u.username} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{u.username}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{u.bio || "Member"}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {searchResults.pages.length > 0 && (
                  <div className="py-2">
                    <span className="text-[10px] font-bold text-muted-foreground px-2 uppercase tracking-wider">Pages</span>
                    {searchResults.pages.slice(0, 3).map((p: any) => (
                      <Link key={p.id} href={`/pages/${p.id}`} onClick={() => setSearchResults(null)} className="flex items-center gap-2 p-2 hover:bg-muted rounded-xl transition-colors">
                        <Tv className="h-4 w-4 text-purple-500" />
                        <span className="text-xs font-bold truncate">{p.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
                {searchResults.communities.length > 0 && (
                  <div className="py-2">
                    <span className="text-[10px] font-bold text-muted-foreground px-2 uppercase tracking-wider">Groups</span>
                    {searchResults.communities.slice(0, 3).map((c: any) => (
                      <Link key={c.id} href={`/r/${c.name}`} onClick={() => setSearchResults(null)} className="flex items-center gap-2 p-2 hover:bg-muted rounded-xl transition-colors">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span className="text-xs font-bold truncate">r/{c.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
                {searchResults.marketplace.length > 0 && (
                  <div className="py-2">
                    <span className="text-[10px] font-bold text-muted-foreground px-2 uppercase tracking-wider">Marketplace</span>
                    {searchResults.marketplace.slice(0, 3).map((m: any) => (
                      <Link key={m.id} href="/marketplace" onClick={() => setSearchResults(null)} className="flex items-center justify-between p-2 hover:bg-muted rounded-xl transition-colors">
                        <span className="text-xs font-bold truncate">{m.title}</span>
                        <span className="text-xs font-bold text-green-600">${m.price}</span>
                      </Link>
                    ))}
                  </div>
                )}
                {searchResults.posts.length > 0 && (
                  <div className="py-2">
                    <span className="text-[10px] font-bold text-muted-foreground px-2 uppercase tracking-wider">Posts</span>
                    {searchResults.posts.slice(0, 3).map((post: any) => (
                      <Link key={post.id} href={`/r/${post.community?.name || "all"}/comments/${post.id}`} onClick={() => setSearchResults(null)} className="flex items-center gap-2 p-2 hover:bg-muted rounded-xl transition-colors">
                        <FileText className="h-4 w-4 text-orange-500 flex-shrink-0" />
                        <span className="text-xs truncate">{post.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
                {!searchResults.users.length && !searchResults.pages.length && !searchResults.communities.length && !searchResults.marketplace.length && !searchResults.posts.length && (
                  <div className="p-4 text-center text-xs text-muted-foreground">No matching results found</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Facebook-style Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          <Link href="/" className={linkClass("/")} aria-label="Home" title="Home">
            <Home className="h-5 w-5" />
            <span className="hidden lg:inline">Home</span>
          </Link>
          <Link href="/communities" className={linkClass("/communities")} aria-label="Groups" title="Groups & Communities">
            <Users className="h-5 w-5" />
            <span className="hidden lg:inline">Groups</span>
          </Link>
          <Link href="/pages" className={linkClass("/pages")} aria-label="Pages" title="Creator Pages & Watch">
            <Tv className="h-5 w-5" />
            <span className="hidden lg:inline">Pages</span>
          </Link>
          <Link href="/marketplace" className={linkClass("/marketplace")} aria-label="Marketplace" title="Marketplace">
            <ShoppingBag className="h-5 w-5" />
            <span className="hidden lg:inline">Marketplace</span>
          </Link>
        </nav>

        {/* Right: Actions, Notifications, User Menu */}
        <div className="flex flex-shrink-0 items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 rounded-full bg-muted/50 p-0 hover:bg-muted dark:border dark:border-white/[0.08] dark:bg-white/[0.05] dark:hover:bg-white/[0.1]"
            aria-label="Toggle theme"
          >
            {mounted && theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {user && <NotificationDropdown />}

          <Button asChild size="sm" className="rounded-xl bg-gradient-to-br from-[#2f7a4a] to-[#123b21] px-3 text-xs font-semibold text-white shadow-sm transition-all hover:from-[#3c9459] hover:to-[#164a29] dark:from-[#3b6eff] dark:to-[#274ecf] dark:shadow-[0_6px_18px_rgba(59,110,255,.35)] dark:hover:shadow-[0_12px_26px_rgba(59,110,255,.5)] sm:px-4 sm:text-sm">
            <Link href="/submit">
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Create</span>
            </Link>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 p-1 rounded-full hover:bg-muted transition-colors focus:outline-none ring-2 ring-primary/20">
                  <Avatar src={user.image} alt={user.username} size="sm" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl">
                <div className="flex items-center justify-start gap-3 p-2 bg-muted/50 rounded-xl mb-1">
                  <Avatar src={user.image} alt={user.username} size="sm" />
                  <div className="flex flex-col min-w-0 leading-none">
                    <p className="font-bold text-sm truncate">{user.username}</p>
                    <p className="truncate text-xs text-muted-foreground mt-0.5">
                      {user.email || "Verified Member"}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-xl">
                  <Link href={`/u/${user.username}`} className="flex items-center font-medium">
                    <User className="mr-2.5 h-4 w-4 text-blue-500" />
                    Profile & Timeline
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl">
                  <Link href="/pages" className="flex items-center font-medium">
                    <Tv className="mr-2.5 h-4 w-4 text-purple-500" />
                    My Pages & Feed
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl">
                  <Link href="/marketplace" className="flex items-center font-medium">
                    <ShoppingBag className="mr-2.5 h-4 w-4 text-green-500" />
                    Marketplace
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl">
                  <Link href="/admin/moderation" className="flex items-center font-medium text-amber-600 dark:text-amber-400">
                    <ShieldAlert className="mr-2.5 h-4 w-4" />
                    Moderation Board
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl">
                  <Link href="/settings" className="flex items-center font-medium">
                    <Settings className="mr-2.5 h-4 w-4 text-gray-500" />
                    Settings & Privacy
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="flex items-center font-medium text-red-600 rounded-xl">
                  <LogOut className="mr-2.5 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild size="sm" className="rounded-full px-3">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full bg-primary text-primary-foreground px-4 shadow-sm">
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
