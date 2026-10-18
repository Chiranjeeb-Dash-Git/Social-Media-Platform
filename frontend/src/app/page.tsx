"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "react-query";
import Link from "next/link";
import { Bookmark, Clock, Film, Globe2, Home, Image as ImageIcon, Plus, ShieldAlert, ShoppingBag, Smile, Users, Video, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PostCard, type Post } from "@/components/PostCard";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { AddFriendsModal } from "@/components/AddFriendsModal";

type Community = { id: string; name: string; members: number };
type Story = { id: string; text: string; mediaUrl?: string | null; mediaType?: string | null; createdAt: string; expiresAt: string; author: { username: string; image?: string | null } };

export default function HomePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showAddFriendsModal, setShowAddFriendsModal] = useState(false);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [storyTitle, setStoryTitle] = useState("");
  const [storyDuration, setStoryDuration] = useState("24");
  const [storyMedia, setStoryMedia] = useState<{ url: string; type: string } | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [feedTab, setFeedTab] = useState<"ALL" | "FRIENDS" | "LIVE">("ALL");

  useEffect(() => setSearchQuery(new URLSearchParams(window.location.search).get("q") ?? ""), []);
  const queryClient = useQueryClient();
  const { data: stories = [] } = useQuery<Story[]>({ queryKey: ["stories"], queryFn: async () => (await axios.get("/api/stories")).data, refetchInterval: 30000 });

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

  const isOnline = (lastSeen?: string | null) => Boolean(lastSeen && Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000);
  const visiblePosts = useMemo(() => posts.filter((post) => {
    const matchesSearch = !searchQuery || [post.title, post.content ?? "", post.author?.username, post.community?.name].join(" ").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = feedTab === "ALL" || (feedTab === "LIVE" ? post.isLive : post.privacy === "FRIENDS" || post.author?.id === user?.id || post.upvotes > 2);
    return matchesSearch && matchesTab;
  }), [posts, searchQuery, feedTab, user?.id]);

  const createStory = async () => {
    const title = storyTitle.trim();
    if (!title && !storyMedia) return;
    if (!user) { setShowStoryCreator(false); return; }
    await axios.post("/api/stories", { text: title, mediaUrl: storyMedia?.url, mediaType: storyMedia?.type, durationHours: Number(storyDuration) }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
    queryClient.invalidateQueries(["stories"]);
    setStoryTitle("");
    setStoryMedia(null);
    setStoryDuration("24");
    setShowStoryCreator(false);
  };

  const handleStoryMedia = (file: File) => { if (file.size > 4 * 1024 * 1024) return; const reader = new FileReader(); reader.onload = () => setStoryMedia({ url: String(reader.result), type: file.type }); reader.readAsDataURL(file); };

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
              {stories.map((story) => <button key={story.id} onClick={() => setSelectedStory(story)} className="pulse-story relative h-[160px] min-w-[100px] overflow-hidden rounded-[18px] p-3 text-left" style={{ backgroundImage: story.mediaUrl ? `url(${story.mediaUrl})` : undefined, background: story.mediaUrl ? undefined : "linear-gradient(160deg,#315ee9,#0c2717)", backgroundSize: "cover", backgroundPosition: "center" }}><span className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" /><Avatar src={story.author.image} alt={story.author.username} size="sm" className="absolute left-2 top-2 border-white" /><span className="absolute bottom-3 left-2 right-2 line-clamp-2 text-xs font-bold text-white">{story.author.username}{story.text ? `: ${story.text}` : ""}</span></button>)}
              {!stories.length && <div className="flex h-[160px] min-w-[220px] items-center justify-center rounded-[18px] border border-dashed border-border text-center text-xs text-muted-foreground">No stories yet. Be the first to share.</div>}
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
          <div className="pulse-card mt-5 p-5"><div className="pulse-card-head"><h4>Friends</h4><button onClick={() => setShowAddFriendsModal(true)}>+ Add Friends</button></div>{activeFriends.length ? <div className="space-y-2">{activeFriends.slice(0, 8).map((friend: any) => <button key={friend.id} onClick={() => window.dispatchEvent(new CustomEvent("open-chat-with", { detail: { targetUserId: friend.id, targetUsername: friend.username, targetImage: friend.image } }))} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left text-sm font-bold text-[#123b21] hover:bg-white/60 dark:text-[#eef0f5] dark:hover:bg-white/[0.06]"><Avatar src={friend.image} alt={friend.username} size="sm" /><span>{friend.username}</span><span className="ml-auto flex items-center gap-1 text-[10px] font-normal text-muted-foreground"><i className={`h-2 w-2 rounded-full ${isOnline(friend.lastSeen) ? "bg-[#2ecf78]" : "bg-gray-400"}`} />{isOnline(friend.lastSeen) ? "Online" : "Offline"}</span></button>)}</div> : <div className="pulse-empty-box py-8"><Users className="mx-auto mb-4 h-8 w-8 text-[#4a8a5c] dark:text-[#9b5cff]" /><h5>No friends connected</h5><p>Add real friends to see their status, share posts, and chat.</p><Button onClick={() => setShowAddFriendsModal(true)} className="mt-4 w-full rounded-xl bg-[#123b21] text-white shadow-[0_10px_22px_rgba(18,59,33,.18)] dark:bg-[#315ee9] dark:shadow-[0_10px_22px_rgba(59,110,255,.38)]">Find New Friends</Button></div>}</div>
          <div className="px-2 pt-8 text-xs text-[#8b90a3]"><div className="flex gap-2"><span>Privacy</span><span>·</span><span>Terms</span><span>·</span><span>Safety</span></div><p className="mt-2 text-[#5a5f70]">© 2026 SocialPulse Platform. All rights reserved.</p></div>
        </aside>
      </div>
      {showStoryCreator && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"><div className="pulse-card w-full max-w-md p-5"><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-black">Create Story</h3><button onClick={() => setShowStoryCreator(false)} className="rounded-full p-2 hover:bg-white/10"><X className="h-5 w-5" /></button></div><label className="text-xs font-bold uppercase tracking-[1px] text-muted-foreground">Text or photo</label><textarea value={storyTitle} onChange={(event) => setStoryTitle(event.target.value)} maxLength={120} className="mt-2 min-h-28 w-full rounded-2xl border border-border bg-background/70 p-4 text-sm" placeholder="Share a quick update..." /><input type="file" accept="image/*" className="mt-4 block w-full text-sm" onChange={e => { const file = e.target.files?.[0]; if (file) handleStoryMedia(file); }} />{storyMedia && <img src={storyMedia.url} alt="Story preview" className="mt-3 max-h-48 w-full rounded-xl object-cover" />}<select value={storyDuration} onChange={(event) => setStoryDuration(event.target.value)} className="mt-4 w-full rounded-xl border border-border bg-background/70 p-3 text-sm"><option value="6">6 hours</option><option value="12">12 hours</option><option value="24">24 hours</option></select><Button onClick={createStory} className="mt-5 w-full rounded-xl bg-[#315ee9] text-white">Add to Story Section</Button></div></div>}
      {selectedStory && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedStory(null)}><div className="relative max-h-[90vh] max-w-lg overflow-hidden rounded-2xl bg-card" onClick={e => e.stopPropagation()}>{selectedStory.mediaUrl && <img src={selectedStory.mediaUrl} alt="Story" className="max-h-[75vh] w-full object-contain" />}<div className="p-4"><div className="font-bold">{selectedStory.author.username}</div><p className="text-sm">{selectedStory.text}</p></div></div></div>}
      {showCreatePost && <CreatePostDialog onClose={() => setShowCreatePost(false)} />}{showAddFriendsModal && <AddFriendsModal onClose={() => setShowAddFriendsModal(false)} />}
    </main>
  );
}
