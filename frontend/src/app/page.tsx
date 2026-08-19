"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { useQuery } from "react-query";
import Link from "next/link";
import { Bookmark, CalendarDays, Film, Globe2, Heart, Home, Image as ImageIcon, Leaf, ShoppingBag, Smile, Store, Users, Video } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PostCard, type Post } from "@/components/PostCard";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { AddFriendsModal } from "@/components/AddFriendsModal";

type Community = { id: string; name: string; members: number };

const stories = [
  ["Meera", "5", "s1"], ["Rohan", "8", "s2"], ["Isha", "15", "s3"], ["Kabir", "21", "s4"],
];

export default function HomePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showAddFriendsModal, setShowAddFriendsModal] = useState(false);
  const [feedTab, setFeedTab] = useState<"ALL" | "FRIENDS" | "LIVE">("ALL");
  const [fullscreen, setFullscreen] = useState(false);

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
    <main className="verdant-page min-h-screen pb-4">
      <div className="verdant-layout relative z-10 grid w-full grid-cols-1 gap-4 px-3 pt-4 sm:px-5 lg:grid-cols-[270px_minmax(0,1fr)_300px] lg:px-0 lg:pt-0">
        <aside className="verdant-card social-side hidden rounded-[20px] p-[18px] lg:sticky lg:top-14 lg:block lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto">
          <div className="space-y-2">
            {user ? <Link href={`/u/${user.username}`} className="verdant-pill flex items-center gap-3 rounded-2xl p-3 font-bold text-sm"><Avatar src={user.image} alt={user.username} size="sm" />{user.username}</Link> : <div className="rounded-2xl bg-[#e9f7dc] p-3 text-xs font-bold text-[#123b21]">Sign in to grow your profile.</div>}
            {[[Home, "News Feed", "/"], [Users, "Friends", "/friends"], [Film, "Watch", "/pages"], [ShoppingBag, "Marketplace", "/marketplace"], [CalendarDays, "Events", "/communities"], [Bookmark, "Saved", `/u/${user?.username || "demo"}`]].map(([Icon, label, href]) => <Link key={label as string} href={href as string} className="verdant-pill flex items-center gap-3 rounded-2xl p-3 text-sm font-semibold transition"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15"><Icon className="h-4 w-4" /></span>{label as string}</Link>)}
          </div>
          <h4 className="mt-5 px-1 pb-2 text-[11px] font-bold uppercase tracking-[1.2px] text-[#123b21]/60">Shortcuts</h4>
          {communities.slice(0, 3).map((community) => <Link key={community.id} href={`/r/${community.name}`} className="flex items-center gap-3 rounded-2xl p-2.5 text-xs font-bold text-[#123b21] hover:bg-white/60"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#d7eac4]"><Leaf className="h-4 w-4" /></span>{community.name}</Link>)}
          {!communities.length && <p className="px-2 text-xs text-[#4d6656]">Garden Lovers<br />Photography Club</p>}
        </aside>

        <section className="min-w-0 lg:py-4">
          <div className="verdant-card rounded-[20px] p-3 sm:p-[18px]">
            <div className="flex gap-3 overflow-x-auto pb-1">
              <button onClick={() => setShowCreatePost(true)} className="verdant-story flex h-[160px] min-w-[100px] flex-col items-center justify-end rounded-[18px] bg-gradient-to-b from-[#eef8da] to-[#e9f7dc] pb-3 text-xs font-bold text-[#0c2717]"><span className="mb-12 flex h-10 w-10 items-center justify-center rounded-xl verdant-pill text-2xl">+</span>Add Story</button>
              {stories.map(([name, image, seed]) => <button key={name} onClick={() => setFullscreen(true)} className="verdant-story relative h-[160px] min-w-[100px] overflow-hidden rounded-[18px] text-left" style={{ backgroundImage: `url(https://picsum.photos/seed/${seed}/200/300)` }}><span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0c2717]/90 to-transparent" /><Avatar src={`https://i.pravatar.cc/60?img=${image}`} alt={name} size="sm" className="absolute left-2 top-2 border-[#d8c774]" /><span className="absolute bottom-3 left-2 text-xs font-bold text-white">{name}</span></button>)}
            </div>
          </div>

          <div className="verdant-card mt-4 rounded-[20px] p-4 sm:p-[18px]">
            <div className="flex items-center gap-3"><Avatar src={user?.image} alt={user?.username || "Aarav"} size="md" /><button onClick={() => setShowCreatePost(true)} className="flex-1 rounded-2xl border border-[#123b21]/10 bg-white/60 px-4 py-3 text-left text-sm text-[#4d6656] transition focus:bg-white">What&apos;s growing on your mind, {user?.username || "Aarav"}?</button></div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#123b21]/10 pt-3"><button onClick={() => setShowCreatePost(true)} className="verdant-pill flex items-center justify-center gap-2 rounded-xl p-2 text-xs font-bold"><Video className="h-4 w-4" />Live</button><button onClick={() => setShowCreatePost(true)} className="verdant-pill flex items-center justify-center gap-2 rounded-xl p-2 text-xs font-bold"><ImageIcon className="h-4 w-4" />Photo</button><button onClick={() => setShowCreatePost(true)} className="verdant-pill flex items-center justify-center gap-2 rounded-xl p-2 text-xs font-bold"><Smile className="h-4 w-4" />Feeling</button></div>
          </div>

          <div className="verdant-card mt-4 flex items-center justify-between rounded-2xl p-1.5"><div className="flex gap-1">{([["ALL", Globe2, "News Feed"], ["FRIENDS", Users, "Friends"], ["LIVE", Video, "Live"]] as const).map(([tab, Icon, label]) => <button key={tab} onClick={() => setFeedTab(tab)} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${feedTab === tab ? "verdant-pill" : "text-[#4d6656] hover:bg-white/60"}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}</div><span className="hidden px-2 text-[11px] font-bold text-[#4d6656] sm:inline">{visiblePosts.length} posts</span></div>
          {searchQuery && <div className="mt-3 rounded-2xl border border-[#123b21]/15 bg-[#e9f7dc]/70 p-3 text-xs font-bold text-[#123b21]">Showing results for &ldquo;{searchQuery}&rdquo;</div>}
          <div className="mt-4 space-y-4">{postsLoading ? <div className="verdant-card rounded-[20px] p-12 text-center text-sm font-semibold text-[#4d6656]">Loading your garden...</div> : visiblePosts.map((post, index) => <motion.div key={post.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .03 }}><PostCard post={post} /></motion.div>)}{!postsLoading && !visiblePosts.length && <div className="verdant-card rounded-[20px] p-12 text-center"><Heart className="mx-auto mb-3 h-10 w-10 text-[#4a8a5c]" /><h3 className="font-extrabold">Nothing blooming here yet</h3><Button onClick={() => setShowCreatePost(true)} className="mt-4 rounded-xl bg-[#123b21] text-white">Create a post</Button></div>}</div>
        </section>

        <aside className="social-side hidden space-y-4 lg:sticky lg:top-14 lg:block lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto">
          <div className="verdant-card rounded-[20px] p-[18px]"><h4 className="mb-3 text-[11px] font-bold uppercase tracking-[1.2px] text-[#123b21]/60">Sponsored</h4><div className="flex h-28 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2f7a4a] to-[#0c2717] text-xs font-bold tracking-widest text-[#eafbe4]/60"><Store className="mr-2 h-5 w-5" />AD SPACE</div></div>
          <div className="verdant-card rounded-[20px] p-[18px]"><div className="mb-3 flex items-center justify-between"><h4 className="text-[11px] font-bold uppercase tracking-[1.2px] text-[#123b21]/60">Contacts</h4><button onClick={() => setShowAddFriendsModal(true)} className="text-xs font-bold text-[#2f7a4a]">+ Add</button></div>{activeFriends.length ? activeFriends.slice(0, 5).map((friend: any) => <button key={friend.id} onClick={() => window.dispatchEvent(new CustomEvent("open-chat-with", { detail: { targetUserId: friend.id, targetUsername: friend.username, targetImage: friend.image } }))} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-white/60"><Avatar src={friend.image} alt={friend.username} size="sm" /><span className="text-xs font-bold text-[#123b21]">{friend.username}</span><i className="ml-auto h-2 w-2 rounded-full bg-[#5be07f] shadow-[0_0_6px_#5be07f]" /></button>) : <p className="py-4 text-center text-xs text-[#4d6656]">Add friends to see who&apos;s online.</p>}</div>
          {pages.slice(0, 2).map((page: any) => <Link key={page.id} href={`/pages/${page.id}`} className="verdant-card flex items-center gap-3 rounded-2xl p-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d7eac4] font-bold text-[#123b21]">{page.name?.[0] || "P"}</span><span className="text-xs font-bold text-[#123b21]">{page.name}</span></Link>)}
        </aside>
      </div>
      {fullscreen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#06140c]/95 p-6" onClick={() => setFullscreen(false)}><button className="absolute right-8 top-8 rounded-xl verdant-pill px-4 py-3 text-xl">×</button><div className="flex h-[min(70vh,540px)] w-[min(84vw,760px)] items-center justify-center rounded-[22px] bg-gradient-to-br from-[#2f7a4a] to-[#0c2717] font-bold text-[#eafbe4]">Story preview</div></div>}
      {showCreatePost && <CreatePostDialog onClose={() => setShowCreatePost(false)} />}{showAddFriendsModal && <AddFriendsModal onClose={() => setShowAddFriendsModal(false)} />}
    </main>
  );
}
