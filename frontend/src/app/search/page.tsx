"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useQuery } from "react-query";
import Link from "next/link";
import { Search as SearchIcon, Users, FileText, Tv, ShoppingBag, Globe, Filter } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PostCard, type Post } from "@/components/PostCard";

export default function SearchEnginePage() {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "POSTS" | "USERS" | "COMMUNITIES" | "PAGES" | "MARKETPLACE">("ALL");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setQuery(q);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["universal_search_full", query, filterType],
    queryFn: async () => {
      if (!query.trim()) return { users: [], posts: [], communities: [], pages: [], marketplace: [] };
      const res = await axios.get(`/api/search?q=${encodeURIComponent(query)}&type=${filterType}`);
      return res.data;
    },
    enabled: Boolean(query.trim())
  });

  const totalResults = data ? (data.users?.length || 0) + (data.posts?.length || 0) + (data.communities?.length || 0) + (data.pages?.length || 0) + (data.marketplace?.length || 0) : 0;

  return (
    <div className="min-h-screen bg-muted/15 py-6">
      <div className="container max-w-6xl mx-auto px-4 space-y-6">
        
        {/* Search Header */}
        <div className="bg-card rounded-3xl border p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <SearchIcon className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gradient">Universal Search Engine</h1>
              <p className="text-xs text-muted-foreground font-semibold">Search across all platform posts, members, communities, creator pages, and marketplace listings</p>
            </div>
          </div>

          <div className="relative max-w-2xl">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search anything on SocialPulse..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-muted font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 border"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pt-2">
            {[
              { id: "ALL", label: "All Results", icon: Globe },
              { id: "POSTS", label: "Posts", icon: FileText },
              { id: "USERS", label: "People", icon: Users },
              { id: "COMMUNITIES", label: "Groups", icon: Users },
              { id: "PAGES", label: "Creator Pages", icon: Tv },
              { id: "MARKETPLACE", label: "Marketplace", icon: ShoppingBag },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filterType === tab.id ? "bg-blue-600 text-white shadow-sm" : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Results Body */}
        {!query.trim() ? (
          <div className="bg-card rounded-3xl border p-16 text-center space-y-3">
            <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
            <h3 className="font-extrabold text-lg">Type to start searching</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Enter keywords, member usernames, or marketplace item names above to query the live database!
            </p>
          </div>
        ) : isLoading ? (
          <div className="bg-card rounded-3xl border p-16 text-center text-sm font-semibold text-muted-foreground">Searching database...</div>
        ) : totalResults === 0 ? (
          <div className="bg-card rounded-3xl border p-16 text-center space-y-3">
            <h3 className="font-extrabold text-lg">No matches found for &ldquo;{query}&rdquo;</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">Try checking your spelling or selecting a broader filter category above.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-xs font-bold text-muted-foreground px-2">
              Found {totalResults} total results matching &ldquo;{query}&rdquo;
            </div>

            {/* People Results */}
            {data.users && data.users.length > 0 && (
              <div className="bg-card rounded-3xl border p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-base flex items-center gap-2"><Users className="h-5 w-5 text-blue-500" /> People matching &ldquo;{query}&rdquo;</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {data.users.map((u: any) => (
                    <Link key={u.id} href={`/u/${u.username}`} className="flex items-center gap-3 p-3 rounded-2xl border bg-muted/20 hover:bg-muted transition-colors">
                      <Avatar src={u.image} alt={u.username} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-sm truncate text-foreground">{u.username}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{u.bio || "Platform Member"}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Communities Results */}
            {data.communities && data.communities.length > 0 && (
              <div className="bg-card rounded-3xl border p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-base flex items-center gap-2"><Users className="h-5 w-5 text-green-500" /> Groups & Communities</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {data.communities.map((c: any) => (
                    <Link key={c.id} href={`/r/${c.name}`} className="flex items-center gap-3 p-3 rounded-2xl border bg-muted/20 hover:bg-muted transition-colors">
                      <div className="h-10 w-10 rounded-xl bg-green-500/10 text-green-600 font-extrabold flex items-center justify-center">r/</div>
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-sm truncate text-foreground">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.members || 1} members</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Creator Pages Results */}
            {data.pages && data.pages.length > 0 && (
              <div className="bg-card rounded-3xl border p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-base flex items-center gap-2"><Tv className="h-5 w-5 text-purple-500" /> Creator Pages</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {data.pages.map((p: any) => (
                    <Link key={p.id} href={`/pages/${p.id}`} className="flex items-center gap-3 p-3 rounded-2xl border bg-muted/20 hover:bg-muted transition-colors">
                      <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 font-extrabold flex items-center justify-center">{p.name?.[0] || "P"}</div>
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-sm truncate text-foreground">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.category} • {(p.followers || 1).toLocaleString()} followers</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Marketplace Results */}
            {data.marketplace && data.marketplace.length > 0 && (
              <div className="bg-card rounded-3xl border p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-base flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-green-600" /> Marketplace Listings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {data.marketplace.map((m: any) => (
                    <Link key={m.id} href="/marketplace" className="flex items-center gap-3 p-3 rounded-2xl border bg-muted/20 hover:bg-muted transition-colors">
                      <img src={m.imageUrls?.[0] || "https://images.unsplash.com/photo-1526738549149-8e07eca6c147"} alt="item" className="h-12 w-12 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-1">
                          <p className="font-extrabold text-sm truncate text-foreground">{m.title}</p>
                          <span className="font-black text-xs text-green-600">${m.price}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{m.location} • {m.condition}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Posts Results */}
            {data.posts && data.posts.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-extrabold text-base px-2 flex items-center gap-2"><FileText className="h-5 w-5 text-blue-500" /> Posts & Discussions</h3>
                {data.posts.map((post: any) => (
                  <div key={post.id}>
                    <PostCard post={post} />
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
