"use client";

import { useState } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "react-query";
import Link from "next/link";
import { Tv, Users, ShieldCheck, Check, Plus, Video, Share2, MoreHorizontal, Film, Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import { PostCard, type Post } from "@/components/PostCard";
import { CreatePostDialog } from "@/components/CreatePostDialog";

export function PageDetailClient({ pageId }: { pageId: string }) {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);

  const { data: page, isLoading } = useQuery({
    queryKey: ["page_detail", pageId],
    queryFn: async () => {
      const res = await axios.get<any>(`/api/pages/${pageId}`);
      return res.data;
    }
  });

  const { data: allPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["posts_for_page", pageId],
    queryFn: async () => {
      const res = await axios.get<Post[]>("/api/posts");
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-extrabold text-foreground">Creator Page not found</h2>
        <p className="text-sm text-muted-foreground mt-2">This Page does not exist or has been removed.</p>
        <Button asChild className="mt-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white"><Link href="/pages">Explore All Pages</Link></Button>
      </div>
    );
  }

  const handleFollowToggle = () => {
    setIsFollowing(!isFollowing);
    toast.success(!isFollowing ? `Following ${page.name}!` : `Unfollowed ${page.name}`);
  };

  const isOwner = user?.id === page.ownerId;

  return (
    <div className="min-h-screen bg-muted/15 pb-16">
      
      {/* Cover Photo Header */}
      <div className="bg-card border-b shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div
            className="h-56 sm:h-80 w-full bg-slate-800 bg-cover bg-center rounded-b-3xl relative overflow-hidden shadow-inner"
            style={{ backgroundImage: `url(${page.coverPhoto || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"})` }}
          >
            <span className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md flex items-center gap-1.5">
              <Tv className="h-4 w-4 text-purple-400" /> {page.category}
            </span>
          </div>

          <div className="px-4 sm:px-8 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-12 relative z-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
              <div className="h-32 w-32 sm:h-40 sm:w-40 rounded-3xl border-4 border-card bg-gradient-to-tr from-purple-600 via-pink-600 to-red-500 text-white font-black text-4xl flex items-center justify-center shadow-2xl flex-shrink-0">
                {page.name?.[0]?.toUpperCase() || "P"}
              </div>
              <div className="mb-2">
                <h1 className="text-2xl sm:text-3xl font-black text-foreground flex items-center justify-center sm:justify-start gap-2">
                  <span>{page.name}</span>
                  <ShieldCheck className="h-6 w-6 text-purple-600 flex-shrink-0" title="Verified Creator Page" />
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-muted-foreground mt-1 max-w-xl">{page.description || "Official Creator Page & Watch Channel"}</p>
                <p className="text-xs font-extrabold text-purple-600 mt-2 flex items-center justify-center sm:justify-start gap-1.5">
                  <Users className="h-4 w-4" /> {(page.followers + (isFollowing ? 1 : 0)).toLocaleString()} followers • Public Page
                </p>
              </div>
            </div>

            {/* Page Actions */}
            <div className="flex items-center justify-center sm:justify-end gap-2.5 flex-wrap pb-2">
              <Button
                onClick={handleFollowToggle}
                className={`rounded-xl font-bold px-5 ${
                  isFollowing ? "bg-muted text-foreground border hover:bg-muted/80" : "bg-purple-600 hover:bg-purple-700 text-white shadow-md"
                }`}
              >
                {isFollowing ? <><Check className="mr-2 h-4 w-4 text-green-500" /> Following ✓</> : <><Plus className="mr-2 h-4 w-4" /> Follow Page</>}
              </Button>

              <Button variant="outline" onClick={() => toast.success("Notification priority set for this Page")} className="rounded-xl font-bold px-3">
                <Bell className="h-4 w-4 text-amber-500" />
              </Button>
              <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success("Page link copied!"); }} className="rounded-xl font-bold px-3">
                <Share2 className="h-4 w-4 text-blue-500" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="max-w-5xl mx-auto px-4 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Page Info */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-card rounded-3xl border p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-base flex items-center gap-2"><Tv className="h-4 w-4 text-purple-600" /> Page Transparency</h3>
            <div className="space-y-3 text-xs text-muted-foreground font-semibold">
              <p className="bg-muted/40 p-3 rounded-2xl border text-foreground leading-relaxed font-normal">{page.description || "Official Creator Page & Watch Channel"}</p>
              <div className="flex items-center justify-between pt-2 border-t">
                <span>Category:</span>
                <span className="font-extrabold text-foreground">{page.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Created:</span>
                <span className="font-extrabold text-foreground">{new Date(page.createdAt || Date.now()).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Page Feed & Broadcasts */}
        <div className="lg:col-span-8 space-y-5">
          {isOwner && (
            <div className="bg-card rounded-3xl border p-4 shadow-sm flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center text-sm">
                {page.name?.[0]?.toUpperCase() || "P"}
              </div>
              <button onClick={() => setShowCreatePost(true)} className="flex-1 h-11 rounded-full bg-muted/70 hover:bg-muted px-4 text-left text-sm font-semibold text-muted-foreground border">
                Create a new post or broadcast as {page.name}...
              </button>
            </div>
          )}

          {postsLoading ? (
            <div className="p-12 text-center text-sm font-semibold text-muted-foreground bg-card rounded-3xl border">Loading Page updates...</div>
          ) : allPosts.length === 0 ? (
            <div className="bg-card rounded-3xl border p-12 text-center space-y-3">
              <Film className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
              <h3 className="font-extrabold text-base">No video or text updates published yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                When {page.name} shares video broadcasts or community updates, they will appear in this feed!
              </p>
            </div>
          ) : (
            allPosts.map(p => <PostCard key={p.id} post={p} />)
          )}
        </div>
      </div>

      {showCreatePost && <CreatePostDialog onClose={() => setShowCreatePost(false)} />}
    </div>
  );
}
