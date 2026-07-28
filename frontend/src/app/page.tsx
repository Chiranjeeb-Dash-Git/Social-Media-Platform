"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { useQuery } from "react-query";
import Link from "next/link";
import {
  Home, Plus, TrendingUp, Users, Tv, ShoppingBag, Bookmark, ShieldAlert,
  Video, Image as ImageIcon, Smile, Globe, Lock, UserCheck, Flame, Radio
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PostCard, type Post } from "@/components/PostCard";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { AddFriendsModal } from "@/components/AddFriendsModal";

type Community = {
  id: string;
  name: string;
  icon?: string;
  members: number;
  _count?: { posts: number };
};

export default function HomePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showAddFriendsModal, setShowAddFriendsModal] = useState(false);
  const [feedTab, setFeedTab] = useState<"ALL" | "FRIENDS" | "LIVE">("ALL");

  const { data: activeFriends = [] } = useQuery({
    queryKey: ["my_real_friends", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await axios.get("/api/users/relationships?type=friends");
      return response.data;
    },
    enabled: Boolean(user),
    refetchInterval: 15000,
  });

  useEffect(() => {
    setSearchQuery(new URLSearchParams(window.location.search).get("q") ?? "");
  }, []);

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const response = await axios.get<Post[]>("/api/posts");
      return response.data;
    },
    refetchInterval: 15000,
  });

  const { data: communities = [] } = useQuery({
    queryKey: ["communities"],
    queryFn: async () => {
      const response = await axios.get<Community[]>("/api/communities");
      return response.data;
    },
  });

  const { data: pages = [] } = useQuery({
    queryKey: ["pages_sample"],
    queryFn: async () => {
      const response = await axios.get<any[]>("/api/pages");
      return response.data;
    },
  });

  const visiblePosts = useMemo(() => {
    let filtered = posts;

    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((post) =>
        [post.title, post.content ?? "", post.author?.username, post.community?.name]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    // Filter by Feed Tab
    if (feedTab === "LIVE") {
      filtered = filtered.filter((p) => p.isLive);
    } else if (feedTab === "FRIENDS") {
      // Show only posts from friends or self (in prototype, simulate or check privacy)
      filtered = filtered.filter((p) => p.privacy === "FRIENDS" || p.author?.id === user?.id || p.upvotes > 2);
    }

    return filtered;
  }, [posts, searchQuery, feedTab, user?.id]);

  return (
    <main className="min-h-screen bg-muted/15 py-4 sm:py-6">
      <div className="container mx-auto max-w-7xl px-3 sm:px-4">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          
          {/* Left Sidebar: Facebook Navigation Shortcuts */}
          <aside className="hidden lg:block lg:col-span-3 space-y-2 sticky top-20 h-fit">
            <div className="bg-card rounded-3xl border p-4 shadow-sm space-y-1">
              {user ? (
                <Link
                  href={`/u/${user.username}`}
                  className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-muted font-bold text-sm transition-colors"
                >
                  <Avatar src={user.image} alt={user.username} size="sm" />
                  <span className="truncate">{user.username}</span>
                </Link>
              ) : (
                <div className="p-3 bg-primary/10 rounded-2xl text-xs font-bold text-primary mb-2">
                  Welcome! Sign in to customize your profile and feed.
                </div>
              )}

              <Link href="/" className="flex items-center gap-3 p-2.5 rounded-2xl bg-primary/10 text-primary font-bold text-sm">
                <Home className="h-5 w-5" />
                <span>News Feed</span>
              </Link>
              <Link href="/communities" className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-muted font-semibold text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Users className="h-5 w-5 text-blue-500" />
                <span>Groups & Communities</span>
              </Link>
              <Link href="/pages" className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-muted font-semibold text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Tv className="h-5 w-5 text-purple-500" />
                <span>Creator Pages & Watch</span>
              </Link>
              <Link href="/marketplace" className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-muted font-semibold text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ShoppingBag className="h-5 w-5 text-green-500" />
                <span>Marketplace</span>
              </Link>
              <Link href={`/u/${user?.username || "demo"}`} className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-muted font-semibold text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Bookmark className="h-5 w-5 text-amber-500" />
                <span>Saved Bookmarks</span>
              </Link>
              <Link href="/admin/moderation" className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-muted font-semibold text-sm text-red-500 hover:text-red-600 transition-colors">
                <ShieldAlert className="h-5 w-5" />
                <span>Admin Moderation Board</span>
              </Link>
            </div>

            {/* Popular Groups shortcut list */}
            <div className="bg-card rounded-3xl border p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between px-2">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground">
                  Your Groups
                </h4>
                <Link href="/messages?newGroup=true" className="text-[10px] font-black text-blue-600 hover:underline">
                  + Create Group
                </Link>
              </div>
              <div className="space-y-1">
                {communities.length === 0 ? (
                  <div className="p-3 text-center bg-muted/30 rounded-2xl border border-dashed">
                    <p className="text-xs font-bold text-foreground">No groups created yet</p>
                    <p className="text-[10px] text-muted-foreground mb-2">Connect with all platform members</p>
                    <Link href="/messages?newGroup=true" className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold px-3 py-1 rounded-lg shadow-xs transition-all">
                      + Create Group with User IDs
                    </Link>
                  </div>
                ) : (
                  communities.slice(0, 4).map((c) => (
                    <Link key={c.id} href={`/r/${c.name}`} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-muted transition-colors">
                      <div className="h-7 w-7 rounded-full bg-blue-500/20 text-blue-600 font-extrabold text-xs flex items-center justify-center">
                        #
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.members || 1} members</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </aside>

          {/* Center Feed */}
          <div className="lg:col-span-6 space-y-5">
            
            {/* Facebook Inline Post Composer */}
            <div className="bg-card rounded-3xl border p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <Avatar src={user?.image} alt={user?.username || "User"} size="md" />
                <button
                  type="button"
                  onClick={() => setShowCreatePost(true)}
                  className="flex-1 h-11 rounded-full bg-muted/70 hover:bg-muted px-4 text-left text-sm font-semibold text-muted-foreground transition-all border border-border/50 hover:border-border"
                >
                  What&apos;s on your mind, {user?.username || "Guest"}?
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreatePost(true)}
                  className="flex items-center justify-center gap-2 p-2 rounded-xl hover:bg-red-500/10 text-xs sm:text-sm font-bold text-red-500 transition-colors"
                >
                  <Video className="h-5 w-5 animate-pulse" />
                  <span>Live Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreatePost(true)}
                  className="flex items-center justify-center gap-2 p-2 rounded-xl hover:bg-blue-500/10 text-xs sm:text-sm font-bold text-blue-500 transition-colors"
                >
                  <ImageIcon className="h-5 w-5" />
                  <span>Photo/video</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreatePost(true)}
                  className="flex items-center justify-center gap-2 p-2 rounded-xl hover:bg-amber-500/10 text-xs sm:text-sm font-bold text-amber-500 transition-colors"
                >
                  <Smile className="h-5 w-5" />
                  <span>Feeling/activity</span>
                </button>
              </div>
            </div>

            {/* Feed Sorting Filter Tabs */}
            <div className="bg-card rounded-2xl border p-1.5 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFeedTab("ALL")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    feedTab === "ALL" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>News Feed</span>
                </button>
                <button
                  onClick={() => setFeedTab("FRIENDS")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    feedTab === "FRIENDS" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Friends Feed</span>
                </button>
                <button
                  onClick={() => setFeedTab("LIVE")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    feedTab === "LIVE" ? "bg-red-600 text-white shadow-sm animate-pulse" : "text-muted-foreground hover:text-red-500"
                  }`}
                >
                  <Radio className="h-3.5 w-3.5" />
                  <span>Live Streams</span>
                </button>
              </div>
              <span className="text-[11px] font-bold text-muted-foreground px-2 hidden sm:inline">
                {visiblePosts.length} posts
              </span>
            </div>

            {searchQuery && (
              <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3 text-xs font-bold text-primary flex items-center justify-between">
                <span>Showing search results for &ldquo;{searchQuery}&rdquo;</span>
                <Link href="/" className="hover:underline">Clear</Link>
              </div>
            )}

            {/* Posts Feed */}
            <div className="space-y-5">
              {postsLoading && (
                <div className="bg-card rounded-3xl border p-12 text-center text-sm font-semibold text-muted-foreground">
                  Loading news feed...
                </div>
              )}

              {!postsLoading && visiblePosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <PostCard post={post} />
                </motion.div>
              ))}

              {!postsLoading && visiblePosts.length === 0 && (
                <div className="bg-card rounded-3xl border p-12 text-center space-y-3">
                  <Flame className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                  <h3 className="font-extrabold text-base">No posts to display in this view</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Try switching back to the News Feed tab or create a new post to get the discussion going!
                  </p>
                  <Button onClick={() => setShowCreatePost(true)} className="rounded-xl font-bold text-xs mt-2 bg-blue-600 hover:bg-blue-700 text-white">
                    Create New Post
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Creator Pages & Active Contacts */}
          <aside className="hidden lg:block lg:col-span-3 space-y-5 sticky top-20 h-fit">
            
            {/* Creator Pages / Sponsored */}
            <div className="bg-card rounded-3xl border p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground">
                  Suggested Pages
                </h4>
                <Link href="/pages" className="text-[11px] font-bold text-primary hover:underline">See All</Link>
              </div>
              <div className="space-y-2">
                {pages.slice(0, 3).map((p: any) => (
                  <Link key={p.id} href={`/pages/${p.id}`} className="flex items-center gap-3 p-2 rounded-2xl hover:bg-muted transition-colors">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      {p.name?.[0]?.toUpperCase() || "P"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs truncate text-foreground">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{p.category || "Creator Page"}</p>
                    </div>
                  </Link>
                ))}
                {!pages.length && (
                  <div className="text-xs text-muted-foreground py-2 text-center">
                    Discover Creator Pages in the Pages tab!
                  </div>
                )}
              </div>
              <Button asChild variant="outline" size="sm" className="w-full rounded-xl text-xs font-bold">
                <Link href="/pages">Explore Creator Pages</Link>
              </Button>
            </div>

            {/* Active Contacts / Friends */}
            <div className="bg-card rounded-3xl border p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span>Active Friends</span>
                  {activeFriends.length > 0 && <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddFriendsModal(true)}
                  className="h-6 px-2 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Friends
                </Button>
              </div>
              <div className="space-y-1.5">
                {activeFriends.length === 0 ? (
                  <div className="text-center py-6 px-2 bg-muted/20 rounded-2xl border border-dashed space-y-2">
                    <Users className="h-6 w-6 text-muted-foreground/60 mx-auto" />
                    <p className="text-xs font-bold text-foreground">No friends connected</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Add friends to see their active status, share posts, and chat!
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setShowAddFriendsModal(true)}
                      className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs mt-1"
                    >
                      Find New Friends
                    </Button>
                  </div>
                ) : (
                  activeFriends.map((c: any) => (
                    <div
                      key={c.id}
                      onClick={() => window.dispatchEvent(new CustomEvent("open-chat-with", { detail: { targetUserId: c.id, targetUsername: c.username, targetImage: c.image } }))}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/80 cursor-pointer transition-colors"
                    >
                      <div className="relative">
                        <Avatar src={c.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.username}`} alt={c.username} size="sm" />
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-background bg-green-500 animate-pulse" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs truncate">{c.username}</p>
                        <p className="text-[9px] text-muted-foreground truncate">Online • Click to chat</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {activeFriends.length > 0 && (
                <p className="text-[10px] text-center text-muted-foreground pt-1">
                  Click any friend to message in chat box!
                </p>
              )}
            </div>

            {/* Footer Copyright */}
            <div className="px-4 text-[11px] text-muted-foreground/80 space-y-1 leading-normal">
              <div className="flex flex-wrap gap-2">
                <Link href="/terms" className="hover:underline">Privacy</Link>
                <span>•</span>
                <Link href="/terms" className="hover:underline">Terms</Link>
                <span>•</span>
                <Link href="/admin/moderation" className="hover:underline">Safety</Link>
              </div>
              <p>© 2026 SocialPulse Platform. All rights reserved.</p>
            </div>
          </aside>
        </div>
      </div>

      {showCreatePost && (
        <CreatePostDialog onClose={() => setShowCreatePost(false)} />
      )}
      {showAddFriendsModal && (
        <AddFriendsModal onClose={() => setShowAddFriendsModal(false)} />
      )}
    </main>
  );
}
