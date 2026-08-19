"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { useQuery } from "react-query";
import Link from "next/link";
import { Bookmark, Clock, Film, Globe2, Home, Image as ImageIcon, Plus, ShieldAlert, ShoppingBag, Smile, Users, Video, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PostCard, type Post } from "@/components/PostCard";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { AddFriendsModal } from "@/components/AddFriendsModal";

type Community = { id: string; name: string; members: number };
type Story = { id: string; title: string; author: string; createdAt: number; expiresAt: number; color: string };

const storyColors = ["#2f7a4a", "#ff7a3d", "#3b6eff", "#9b5cff"];

export default function HomePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showAddFriendsModal, setShowAddFriendsModal] = useState(false);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [storyTitle, setStoryTitle] = useState("");
  const [storyDuration, setStoryDuration] = useState("24");
  const [stories, setStories] = useState<Story[]>([]);
  const [feedTab, setFeedTab] = useState<"ALL" | "FRIENDS" | "LIVE">("ALL");

  useEffect(() => setSearchQuery(new URLSearchParams(window.location.search).get("q") ?? ""), []);
  useEffect(() => {
    const loadStories = () => {
      const saved = JSON.parse(localStorage.getItem("socialPulseStories") ?? "[]");
      const active = Array.isArray(saved) ? saved.filter((story: Story) => story.expiresAt > Date.now()) : [];
      setStories(active);
      localStorage.setItem("socialPulseStories", JSON.stringify(active));
    };
    loadStories();
    const timer = window.setInterval(loadStories, 60000);
    return () => window.clearInterval(timer);
  }, []);

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

  const createStory = () => {
    const title = storyTitle.trim();
    if (!title) return;
    const now = Date.now();
    const nextStory: Story = {
      id: `${now}`,
      title,
      author: user?.username || "Guest",
      createdAt: now,
      expiresAt: now + Number(storyDuration) * 60 * 60 * 1000,
      color: storyColors[stories.length % storyColors.length],
    };
    const nextStories = [nextStory, ...stories];
    setStories(nextStories);
    localStorage.setItem("socialPulseStories", JSON.stringify(nextStories));
    setStoryTitle("");
    setStoryDuration("24");
    setShowStoryCreator(false);
  };

  const timeLeft = (story: Story) => {
    const hours = Math.max(1, Math.ceil((story.expiresAt - Date.now()) / (60 * 60 * 1000)));
    return `${hours}h left`;
  };

  return (
    <main className="pulse-page min-h-screen pb-4">
      <div className="pulse-layout relative z-10 grid w-full grid-cols-1 gap-4 px-3 pt-4 sm:px-5 lg:grid-cols-[270px_minmax(0,1fr)_300px] lg:px-0 lg:pt-0 dark:lg:grid-cols-[316px_minmax(0,1fr)_400px] dark:lg:pt-5">
        <aside className="pulse-side hidden lg:sticky lg:top-14 lg:block lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto dark:lg:top-20 dark:lg:h-[calc(100vh-5rem)]">
          <div className="pulse-card p-5">
            <div className="pulse-welcome">Welcome! Sign in to customize your profile and feed.</div>
            {[[Home, "News Feed", "/", true], [Users, "Groups & Communities", "/communities"], [Film, "Creator Pages & Watch", "/pages"], [ShoppingBag, "Marketplace", "/marketplace"], [Bookmark, "Saved Bookmarks", `/u/${user?.username || "demo"}`], [ShieldAlert, "Admin Moderation Board", "/admin/moderation", false, true]].map(([Icon, label, href, active, danger]: any) => <Link key={label} href={href} className={`pulse-menu-item ${active ? "active" : ""} ${danger ? "danger" : ""}`}><Icon className="h-4 w-4" />{label}</Link>)}
          </div>

          <div className="pulse-card mt-5 p-5">
            <div className="pulse-card-head"><h4>Our Groups</h4><Link href="/communities">+ Create Group</Link></div>
            <div className="pulse-empty-box">
              <h5>No groups created yet</h5>
              <p>Connect with all platform members</p>
              <Button asChild className="mt-3 w-full rounded-xl bg-[#123b21] text-white shadow-[0_10px_22px_rgba(18,59,33,.18)] dark:bg-[#315ee9] dark:shadow-[0_10px_22px_rgba(59,110,255,.38)]"><Link href="/communities"><Plus className="mr-1 h-4 w-4" />Create Group with User IDs</Link></Button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 lg:py-4 dark:lg:py-0">
          <div className="pulse-card p-3 sm:p-[18px] dark:p-5 dark:sm:p-6">
            <div className="flex gap-3 overflow-x-auto pb-1">
              <button onClick={() => setShowStoryCreator(true)} className="pulse-story-add flex h-[160px] min-w-[100px] flex-col items-center justify-end rounded-[18px] pb-3 text-xs font-bold"><span className="mb-12 flex h-10 w-10 items-center justify-center rounded-xl pulse-cta text-2xl">+</span>Add Story</button>
              {stories.map((story) => <button key={story.id} className="pulse-story relative h-[160px] min-w-[100px] overflow-hidden rounded-[18px] p-3 text-left" style={{ background: `linear-gradient(160deg, ${story.color}, #0c2717)` }}><span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 to-transparent" /><Avatar src={user?.image} alt={story.author} size="sm" className="absolute left-2 top-2 border-[#d8c774]" /><span className="absolute bottom-8 left-2 right-2 line-clamp-2 text-xs font-bold text-white">{story.title}</span><span className="absolute bottom-3 left-2 flex items-center gap-1 text-[10px] font-bold text-white/75"><Clock className="h-3 w-3" />{timeLeft(story)}</span></button>)}
              {!stories.length && ["Meera", "Rohan", "Isha", "Kabir"].map((name, index) => <div key={name} className="pulse-story relative h-[160px] min-w-[100px] overflow-hidden rounded-[18px] bg-cover bg-center text-left" style={{ backgroundImage: `url(https://picsum.photos/seed/story-${index}/200/300)` }}><span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0c2717]/90 to-transparent" /><Avatar src={`https://i.pravatar.cc/60?img=${index + 5}`} alt={name} size="sm" className="absolute left-2 top-2 border-[#d8c774]" /><span className="absolute bottom-3 left-2 text-xs font-bold text-white">{name}</span></div>)}
            </div>
          </div>

          <div className="pulse-card mt-4 p-5 sm:p-6">
            <div className="flex items-center gap-4"><Avatar src={user?.image} alt={user?.username || "Guest"} size="md" /><button onClick={() => setShowCreatePost(true)} className="pulse-composer-input">What&apos;s on your mind, {user?.username || "Guest"}?</button></div>
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/[0.08] pt-5"><button onClick={() => setShowCreatePost(true)} className="pulse-composer-action text-[#ff4d5e]"><Video className="h-4 w-4" />Live Video</button><button onClick={() => setShowCreatePost(true)} className="pulse-composer-action text-[#3b6eff]"><ImageIcon className="h-4 w-4" />Photo/video</button><button onClick={() => setShowCreatePost(true)} className="pulse-composer-action text-[#ffb020]"><Smile className="h-4 w-4" />Feeling/activity</button></div>
          </div>

          <div className="pulse-card mt-5 flex items-center justify-between p-6"><div className="flex flex-wrap gap-3">{([["ALL", Globe2, "News Feed"], ["FRIENDS", Users, "Friends Feed"], ["LIVE", Video, "Live Streams"]] as const).map(([tab, Icon, label]) => <button key={tab} onClick={() => setFeedTab(tab)} className={`pulse-tab ${feedTab === tab ? "active" : ""}`}><Icon className="h-4 w-4" />{label}</button>)}</div><span className="hidden text-sm font-semibold text-[#a4a8bc] sm:inline">{visiblePosts.length} posts</span></div>
          {searchQuery && <div className="pulse-card mt-4 p-4 text-sm font-bold text-[#ffbf9e]">Showing results for &ldquo;{searchQuery}&rdquo;</div>}
          <div className="mt-5 space-y-5">{postsLoading ? <div className="pulse-card p-12 text-center text-sm font-semibold text-[#8b90a3]">Loading your feed...</div> : visiblePosts.map((post, index) => <motion.div key={post.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .03 }}><PostCard post={post} /></motion.div>)}{!postsLoading && !visiblePosts.length && <div className="pulse-card pulse-feed-empty p-12 text-center"><div className="pulse-flame">🔥</div><h3>No posts to display in this view</h3><p>Try switching back to the News Feed tab or create a new post to get the discussion going!</p><Button onClick={() => setShowCreatePost(true)} className="mt-5 rounded-xl bg-[#123b21] px-8 py-6 text-base font-bold text-white shadow-[0_12px_28px_rgba(18,59,33,.25)] dark:bg-[#315ee9] dark:shadow-[0_12px_28px_rgba(59,110,255,.45)]">Create New Post</Button></div>}</div>
        </section>

        <aside className="pulse-side hidden lg:sticky lg:top-14 lg:block lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto dark:lg:top-20 dark:lg:h-[calc(100vh-5rem)]">
          <div className="pulse-card p-5"><div className="pulse-card-head"><h4>Suggested Pages</h4><Link href="/pages" className="orange">See All</Link></div><div className="pulse-empty-box py-8"><p>Discover Creator Pages in the Pages tab!</p><Button asChild className="mt-4 w-full rounded-xl border border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.1]"><Link href="/pages">Explore Creator Pages</Link></Button></div></div>
          <div className="pulse-card mt-5 p-5"><div className="pulse-card-head"><h4>Active Friends</h4><button onClick={() => setShowAddFriendsModal(true)}>+ Add Friends</button></div>{activeFriends.length ? <div className="space-y-2">{activeFriends.slice(0, 8).map((friend: any) => <button key={friend.id} onClick={() => window.dispatchEvent(new CustomEvent("open-chat-with", { detail: { targetUserId: friend.id, targetUsername: friend.username, targetImage: friend.image } }))} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left text-sm font-bold text-[#123b21] hover:bg-white/60 dark:text-[#eef0f5] dark:hover:bg-white/[0.06]"><Avatar src={friend.image} alt={friend.username} size="sm" /><span>{friend.username}</span><i className="ml-auto h-2 w-2 rounded-full bg-[#2ecf78] shadow-[0_0_8px_#2ecf78]" /></button>)}</div> : <div className="pulse-empty-box py-8"><Users className="mx-auto mb-4 h-8 w-8 text-[#4a8a5c] dark:text-[#9b5cff]" /><h5>No friends connected</h5><p>Add friends to see their active status, share posts, and chat!</p><Button onClick={() => setShowAddFriendsModal(true)} className="mt-4 w-full rounded-xl bg-[#123b21] text-white shadow-[0_10px_22px_rgba(18,59,33,.18)] dark:bg-[#315ee9] dark:shadow-[0_10px_22px_rgba(59,110,255,.38)]">Find New Friends</Button></div>}</div>
          <div className="px-2 pt-8 text-xs text-[#8b90a3]"><div className="flex gap-2"><span>Privacy</span><span>·</span><span>Terms</span><span>·</span><span>Safety</span></div><p className="mt-2 text-[#5a5f70]">© 2026 SocialPulse Platform. All rights reserved.</p></div>
        </aside>
      </div>
      {showStoryCreator && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"><div className="pulse-card w-full max-w-md p-5"><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-black">Create Story</h3><button onClick={() => setShowStoryCreator(false)} className="rounded-full p-2 hover:bg-white/10"><X className="h-5 w-5" /></button></div><label className="text-xs font-bold uppercase tracking-[1px] text-muted-foreground">Story text</label><textarea value={storyTitle} onChange={(event) => setStoryTitle(event.target.value)} maxLength={120} className="mt-2 min-h-28 w-full rounded-2xl border border-border bg-background/70 p-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 dark:border-white/[0.08] dark:bg-white/[0.04]" placeholder="Share a quick update..." /><label className="mt-4 block text-xs font-bold uppercase tracking-[1px] text-muted-foreground">Keep story for</label><select value={storyDuration} onChange={(event) => setStoryDuration(event.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background/70 p-3 text-sm outline-none dark:border-white/[0.08] dark:bg-[#12141d]"><option value="6">6 hours</option><option value="12">12 hours</option><option value="24">24 hours</option></select><Button onClick={createStory} className="mt-5 w-full rounded-xl bg-[#315ee9] text-white">Add to Story Section</Button></div></div>}
      {showCreatePost && <CreatePostDialog onClose={() => setShowCreatePost(false)} />}{showAddFriendsModal && <AddFriendsModal onClose={() => setShowAddFriendsModal(false)} />}
    </main>
  );
}
