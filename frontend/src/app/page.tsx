"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { useQuery } from "react-query";
import Link from "next/link";
import { Bookmark, Film, Globe2, Home, Image as ImageIcon, Plus, ShieldAlert, ShoppingBag, Smile, Users, Video } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PostCard, type Post } from "@/components/PostCard";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { AddFriendsModal } from "@/components/AddFriendsModal";

type Community = { id: string; name: string; members: number };

export default function HomePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showAddFriendsModal, setShowAddFriendsModal] = useState(false);
  const [feedTab, setFeedTab] = useState<"ALL" | "FRIENDS" | "LIVE">("ALL");

  useEffect(() => setSearchQuery(new URLSearchParams(window.location.search).get("q") ?? ""), []);

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["posts"], queryFn: async () => (await axios.get<Post[]>("/api/posts")).data, refetchInterval: 15000,
  });
  const { data: communities = [] } = useQuery({
    queryKey: ["communities"], queryFn: async () => (await axios.get<Community[]>("/api/communities")).data,
  });
  const { data: activeFriends = [] } = useQuery({
    queryKey: ["my_real_friends", user?.id], queryFn: async () => user ? (await axios.get("/api/users/relationships?type=friends")).data : [], enabled: Boolean(user), refetchInterval: 15000,
  });
  const { data: pages = [] } = useQuery({
    queryKey: ["pages_sample"], queryFn: async () => (await axios.get<any[]>("/api/pages")).data,
  });

  const visiblePosts = useMemo(() => posts.filter((post) => {
    const matchesSearch = !searchQuery || [post.title, post.content ?? "", post.author?.username, post.community?.name].join(" ").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = feedTab === "ALL" || (feedTab === "LIVE" ? post.isLive : post.privacy === "FRIENDS" || post.author?.id === user?.id || post.upvotes > 2);
    return matchesSearch && matchesTab;
  }), [posts, searchQuery, feedTab, user?.id]);

  return (
    <main className="pulse-page min-h-screen pb-4">
      <div className="pulse-layout relative z-10 grid w-full grid-cols-1 gap-4 px-3 pt-4 sm:px-5 lg:grid-cols-[316px_minmax(0,1fr)_400px] lg:px-0 lg:pt-5">
        <aside className="pulse-side hidden lg:sticky lg:top-20 lg:block lg:h-[calc(100vh-5rem)] lg:overflow-y-auto">
          <div className="pulse-card p-5">
            <div className="pulse-welcome">Welcome! Sign in to customize your profile and feed.</div>
            {[[Home, "News Feed", "/", true], [Users, "Groups & Communities", "/communities"], [Film, "Creator Pages & Watch", "/pages"], [ShoppingBag, "Marketplace", "/marketplace"], [Bookmark, "Saved Bookmarks", `/u/${user?.username || "demo"}`], [ShieldAlert, "Admin Moderation Board", "/admin/moderation", false, true]].map(([Icon, label, href, active, danger]: any) => <Link key={label} href={href} className={`pulse-menu-item ${active ? "active" : ""} ${danger ? "danger" : ""}`}><Icon className="h-4 w-4" />{label}</Link>)}
          </div>

          <div className="pulse-card mt-5 p-5">
            <div className="pulse-card-head"><h4>Our Groups</h4><Link href="/communities">+ Create Group</Link></div>
            <div className="pulse-empty-box">
              <h5>No groups created yet</h5>
              <p>Connect with all platform members</p>
              <Button asChild className="mt-3 w-full rounded-xl bg-[#315ee9] text-white shadow-[0_10px_22px_rgba(59,110,255,.38)]"><Link href="/communities"><Plus className="mr-1 h-4 w-4" />Create Group with User IDs</Link></Button>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="pulse-card p-5 sm:p-6">
            <div className="flex items-center gap-4"><Avatar src={user?.image} alt={user?.username || "Guest"} size="md" /><button onClick={() => setShowCreatePost(true)} className="pulse-composer-input">What&apos;s on your mind, {user?.username || "Guest"}?</button></div>
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/[0.08] pt-5"><button onClick={() => setShowCreatePost(true)} className="pulse-composer-action text-[#ff4d5e]"><Video className="h-4 w-4" />Live Video</button><button onClick={() => setShowCreatePost(true)} className="pulse-composer-action text-[#3b6eff]"><ImageIcon className="h-4 w-4" />Photo/video</button><button onClick={() => setShowCreatePost(true)} className="pulse-composer-action text-[#ffb020]"><Smile className="h-4 w-4" />Feeling/activity</button></div>
          </div>

          <div className="pulse-card mt-5 flex items-center justify-between p-6"><div className="flex flex-wrap gap-3">{([["ALL", Globe2, "News Feed"], ["FRIENDS", Users, "Friends Feed"], ["LIVE", Video, "Live Streams"]] as const).map(([tab, Icon, label]) => <button key={tab} onClick={() => setFeedTab(tab)} className={`pulse-tab ${feedTab === tab ? "active" : ""}`}><Icon className="h-4 w-4" />{label}</button>)}</div><span className="hidden text-sm font-semibold text-[#a4a8bc] sm:inline">{visiblePosts.length} posts</span></div>
          {searchQuery && <div className="pulse-card mt-4 p-4 text-sm font-bold text-[#ffbf9e]">Showing results for &ldquo;{searchQuery}&rdquo;</div>}
          <div className="mt-5 space-y-5">{postsLoading ? <div className="pulse-card p-12 text-center text-sm font-semibold text-[#8b90a3]">Loading your feed...</div> : visiblePosts.map((post, index) => <motion.div key={post.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .03 }}><PostCard post={post} /></motion.div>)}{!postsLoading && !visiblePosts.length && <div className="pulse-card pulse-feed-empty p-12 text-center"><div className="pulse-flame">🔥</div><h3>No posts to display in this view</h3><p>Try switching back to the News Feed tab or create a new post to get the discussion going!</p><Button onClick={() => setShowCreatePost(true)} className="mt-5 rounded-xl bg-[#315ee9] px-8 py-6 text-base font-bold text-white shadow-[0_12px_28px_rgba(59,110,255,.45)]">Create New Post</Button></div>}</div>
        </section>

        <aside className="pulse-side hidden lg:sticky lg:top-20 lg:block lg:h-[calc(100vh-5rem)] lg:overflow-y-auto">
          <div className="pulse-card p-5"><div className="pulse-card-head"><h4>Suggested Pages</h4><Link href="/pages" className="orange">See All</Link></div><div className="pulse-empty-box py-8"><p>Discover Creator Pages in the Pages tab!</p><Button asChild className="mt-4 w-full rounded-xl border border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.1]"><Link href="/pages">Explore Creator Pages</Link></Button></div></div>
          <div className="pulse-card mt-5 p-5"><div className="pulse-card-head"><h4>Active Friends</h4><button onClick={() => setShowAddFriendsModal(true)}>+ Add Friends</button></div>{activeFriends.length ? <div className="space-y-2">{activeFriends.slice(0, 8).map((friend: any) => <button key={friend.id} onClick={() => window.dispatchEvent(new CustomEvent("open-chat-with", { detail: { targetUserId: friend.id, targetUsername: friend.username, targetImage: friend.image } }))} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left text-sm font-bold text-[#eef0f5] hover:bg-white/[0.06]"><Avatar src={friend.image} alt={friend.username} size="sm" /><span>{friend.username}</span><i className="ml-auto h-2 w-2 rounded-full bg-[#2ecf78] shadow-[0_0_8px_#2ecf78]" /></button>)}</div> : <div className="pulse-empty-box py-8"><Users className="mx-auto mb-4 h-8 w-8 text-[#9b5cff]" /><h5>No friends connected</h5><p>Add friends to see their active status, share posts, and chat!</p><Button onClick={() => setShowAddFriendsModal(true)} className="mt-4 w-full rounded-xl bg-[#315ee9] text-white shadow-[0_10px_22px_rgba(59,110,255,.38)]">Find New Friends</Button></div>}</div>
          <div className="px-2 pt-8 text-xs text-[#8b90a3]"><div className="flex gap-2"><span>Privacy</span><span>·</span><span>Terms</span><span>·</span><span>Safety</span></div><p className="mt-2 text-[#5a5f70]">© 2026 SocialPulse Platform. All rights reserved.</p></div>
        </aside>
      </div>
      {showCreatePost && <CreatePostDialog onClose={() => setShowCreatePost(false)} />}{showAddFriendsModal && <AddFriendsModal onClose={() => setShowAddFriendsModal(false)} />}
    </main>
  );
}
