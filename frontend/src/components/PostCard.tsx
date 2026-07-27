"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "react-query";
import {
  ArrowBigDown,
  ArrowBigUp,
  Bookmark,
  Copy,
  ExternalLink,
  Eye,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
  ThumbsUp,
  Heart,
  Smile,
  AlertOctagon,
  ShieldAlert,
  UserX,
  Clock,
  MapPin,
  BarChart2,
  CheckCircle2,
  Video
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { useAuth } from "@/contexts/AuthContext";

export type Post = {
  id: string;
  title: string;
  content: string | null;
  type?: "TEXT" | "IMAGE" | "LINK";
  url?: string;
  imageUrl?: string;
  privacy?: "PUBLIC" | "FRIENDS" | "ONLY_ME";
  feelingActivity?: string | null;
  locationTag?: string | null;
  bgColorCard?: string | null;
  isLive?: boolean;
  pollData?: any;
  author: {
    id: string;
    username: string;
    image?: string | null;
    isVerified: boolean;
  };
  community?: {
    id: string;
    name: string;
    icon?: string | null;
  };
  upvotes: number;
  downvotes: number;
  _count?: {
    comments: number;
  };
  createdAt: string | Date;
};

interface PostCardProps {
  post: Post;
}

const REACTIONS = [
  { type: "LIKE", emoji: "👍", label: "Like", color: "text-blue-600" },
  { type: "LOVE", emoji: "❤️", label: "Love", color: "text-red-500" },
  { type: "CARE", emoji: "🥰", label: "Care", color: "text-pink-500" },
  { type: "HAHA", emoji: "😂", label: "Haha", color: "text-amber-500" },
  { type: "WOW", emoji: "😮", label: "Wow", color: "text-amber-500" },
  { type: "SAD", emoji: "😢", label: "Sad", color: "text-blue-400" },
  { type: "ANGRY", emoji: "😡", label: "Angry", color: "text-orange-600" },
];

const BG_CARDS_MAP: Record<string, string> = {
  "grad-blue": "bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-extrabold text-xl sm:text-2xl p-10 text-center rounded-2xl shadow-inner",
  "grad-fire": "bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white font-extrabold text-xl sm:text-2xl p-10 text-center rounded-2xl shadow-inner",
  "grad-purple": "bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white font-extrabold text-xl sm:text-2xl p-10 text-center rounded-2xl shadow-inner",
  "grad-emerald": "bg-gradient-to-r from-emerald-600 to-teal-800 text-white font-extrabold text-xl sm:text-2xl p-10 text-center rounded-2xl shadow-inner",
  "dark-card": "bg-slate-900 border border-slate-700 text-amber-400 font-extrabold text-xl sm:text-2xl p-10 text-center rounded-2xl shadow-inner",
};

export function PostCard({ post }: PostCardProps) {
  const { user, token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [displayPost, setDisplayPost] = useState(post);
  const [userVote, setUserVote] = useState<"UP" | "DOWN" | null>(null);
  const [upvotes, setUpvotes] = useState(post.upvotes || 0);
  const [downvotes, setDownvotes] = useState(post.downvotes || 0);
  const [isSaved, setIsSaved] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [relativeTime, setRelativeTime] = useState("Just now");
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [draftTitle, setDraftTitle] = useState(post.title);
  const [draftContent, setDraftContent] = useState(post.content ?? "");
  
  // Facebook Reaction & Poll States
  const [showReactionBar, setShowReactionBar] = useState(false);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({ LIKE: Math.floor((post.upvotes || 5) / 2) || 1, LOVE: 1 });
  const [pollState, setPollState] = useState<any>(post.pollData || null);
  const [votedOptionIdx, setVotedOptionIdx] = useState<number | null>(null);

  const canManagePost = user?.id === displayPost.author?.id;

  const postUrl = useMemo(() => {
    if (typeof window === "undefined") return `/post/${post.id}`;
    return `${window.location.origin}/post/${displayPost.id}`;
  }, [displayPost.id]);

  useEffect(() => {
    setDisplayPost(post);
    setUpvotes(post.upvotes || 0);
    setDownvotes(post.downvotes || 0);
    setDraftTitle(post.title);
    setDraftContent(post.content ?? "");
    setIsDeleted(false);
    if (post.pollData) setPollState(post.pollData);
  }, [post]);

  useEffect(() => {
    if (displayPost.createdAt) {
      setRelativeTime(
        formatDistanceToNow(new Date(displayPost.createdAt), { addSuffix: true })
      );
    }
  }, [displayPost.createdAt]);

  useEffect(() => {
    const savedPosts = JSON.parse(localStorage.getItem("savedPosts") ?? "[]");
    setIsSaved(Array.isArray(savedPosts) && savedPosts.includes(displayPost.id));
  }, [displayPost.id]);

  const handleReaction = async (type: string) => {
    if (!token || !user) {
      toast.error("Log in to react to posts");
      return;
    }
    const oldReaction = myReaction;
    const newReaction = oldReaction === type ? null : type;
    setMyReaction(newReaction);
    setShowReactionBar(false);

    // Optimistic update
    setReactionCounts(prev => {
      const next = { ...prev };
      if (oldReaction && next[oldReaction]) next[oldReaction] = Math.max(0, next[oldReaction] - 1);
      if (newReaction) next[newReaction] = (next[newReaction] || 0) + 1;
      return next;
    });

    try {
      await axios.post("/api/reactions", { postId: displayPost.id, type }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const chosen = REACTIONS.find(r => r.type === newReaction);
      if (chosen) toast.success(`Reacted with ${chosen.emoji}`);
    } catch (err) {
      console.error("Reaction failed:", err);
    }
  };

  const handleVote = async (type: "UP" | "DOWN") => {
    setIsVoting(true);
    try {
      const response = await axios.patch(
        "/api/vote",
        { postId: displayPost.id, type },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      setUserVote(response.data.userVote);
      setUpvotes(response.data.post.upvotes);
      setDownvotes(response.data.post.downvotes);
      setDisplayPost(response.data.post);
      queryClient.invalidateQueries(["posts"]);
    } catch (error) {
      toast.error("Vote failed");
    } finally {
      setIsVoting(false);
    }
  };

  const handleSave = () => {
    const savedPosts = JSON.parse(localStorage.getItem("savedPosts") ?? "[]");
    const currentSavedPosts = Array.isArray(savedPosts) ? savedPosts : [];
    const nextSavedPosts = currentSavedPosts.includes(displayPost.id)
      ? currentSavedPosts.filter((id: string) => id !== displayPost.id)
      : [...currentSavedPosts, displayPost.id];

    localStorage.setItem("savedPosts", JSON.stringify(nextSavedPosts));
    setIsSaved(nextSavedPosts.includes(displayPost.id));
    toast.success(nextSavedPosts.includes(displayPost.id) ? "Post saved to bookmarks" : "Post removed from bookmarks");
  };

  const copyPostLink = async () => {
    await navigator.clipboard.writeText(postUrl);
    toast.success("Link copied to clipboard!");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: displayPost.title,
          text: displayPost.content ?? "",
          url: postUrl,
        });
        return;
      } catch (err) {}
    }
    await copyPostLink();
  };

  const handlePollVote = (idx: number) => {
    if (!token || !user) {
      toast.error("Log in to vote in polls");
      return;
    }
    if (votedOptionIdx === idx) return;
    setVotedOptionIdx(idx);
    const updated = { ...pollState };
    updated.options = updated.options.map((opt: any, i: number) => {
      if (i === idx) return { ...opt, votes: (opt.votes || 0) + 1 };
      if (i === votedOptionIdx) return { ...opt, votes: Math.max(0, (opt.votes || 1) - 1) };
      return opt;
    });
    setPollState(updated);
    toast.success("Poll vote recorded!");
  };

  const handleSnooze = async () => {
    if (!token || !displayPost.author) return;
    try {
      await axios.post("/api/users/relationships", { action: "snooze", targetId: displayPost.author.id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Snoozed ${displayPost.author.username} for 30 days.`);
      setIsDeleted(true);
    } catch (err) {
      toast.error("Could not snooze user");
    }
  };

  const handleReport = async () => {
    if (!token) return;
    const reason = prompt("Why are you reporting this post? (Spam, Harassment, Hate Speech, False Information):", "Spam / Inappropriate Content");
    if (!reason) return;
    try {
      await axios.post("/api/reports", { targetType: "POST", targetId: displayPost.id, reason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Report submitted to moderation board.");
    } catch (err) {
      toast.error("Could not submit report");
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      await axios.delete(`/api/posts/${displayPost.id}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      setIsDeleted(true);
      queryClient.invalidateQueries(["posts"]);
      toast.success("Post deleted.");
      if (window.location.pathname === `/post/${displayPost.id}`) router.push("/");
    } catch (error) {
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isDeleted) return null;

  const currentReactionObj = REACTIONS.find(r => r.type === myReaction) || REACTIONS[0];
  const totalPollVotes = pollState ? pollState.options?.reduce((acc: number, o: any) => acc + (o.votes || 0), 0) || 1 : 1;

  return (
    <motion.article
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card text-card-foreground rounded-3xl border shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden mb-5"
    >
      {/* Live Video Banner */}
      {displayPost.isLive && (
        <div className="bg-red-600 text-white px-4 py-1.5 font-bold text-xs flex items-center justify-between shadow-inner">
          <span className="flex items-center gap-1.5"><Video className="h-4 w-4 animate-pulse" /> LIVE STREAM BROADCAST</span>
          <span className="bg-black/30 px-2 py-0.5 rounded-full text-[10px] animate-pulse">2.4K watching</span>
        </div>
      )}

      <div className="p-5">
        {/* Author & Meta Header */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <Link href={`/u/${displayPost.author?.username || "user"}`}>
              <Avatar src={displayPost.author?.image} alt={displayPost.author?.username || "user"} size="md" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-1.5">
                <Link href={`/u/${displayPost.author?.username || "user"}`} className="font-extrabold text-sm hover:underline text-foreground">
                  {displayPost.author?.username || "Member"}
                </Link>
                {displayPost.author?.isVerified && (
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white" title="Verified Creator">✓</span>
                )}
                {displayPost.feelingActivity && (
                  <span className="text-xs text-muted-foreground font-medium">— {displayPost.feelingActivity}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {displayPost.community && (
                  <Link href={`/r/${displayPost.community.name}`} className="font-bold text-primary hover:underline">
                    r/{displayPost.community.name}
                  </Link>
                )}
                {displayPost.locationTag && (
                  <span className="flex items-center gap-0.5 text-blue-500 font-semibold">
                    <MapPin className="h-3 w-3" /> {displayPost.locationTag}
                  </span>
                )}
                <span>•</span>
                <span>{relativeTime}</span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-muted" aria-label="Post actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5 shadow-xl">
              <DropdownMenuItem asChild className="rounded-xl">
                <Link href={`/post/${displayPost.id}`} className="flex items-center font-medium">
                  <ExternalLink className="mr-2 h-4 w-4 text-blue-500" />
                  Open post detail
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyPostLink} className="rounded-xl font-medium">
                <Copy className="mr-2 h-4 w-4 text-green-500" />
                Copy permalink
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user && displayPost.author?.id !== user.id && (
                <>
                  <DropdownMenuItem onClick={handleSnooze} className="rounded-xl font-medium text-amber-600">
                    <Clock className="mr-2 h-4 w-4" />
                    Snooze for 30 days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleReport} className="rounded-xl font-medium text-red-600">
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Report post
                  </DropdownMenuItem>
                </>
              )}
              {canManagePost && (
                <>
                  <DropdownMenuItem onClick={() => setIsEditing(true)} className="rounded-xl font-medium">
                    <Pencil className="mr-2 h-4 w-4 text-primary" />
                    Edit post
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDeletePost} className="rounded-xl font-medium text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? "Deleting..." : "Delete post"}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Post Content & Background Colored Cards */}
        {isEditing ? (
          <div className="mb-4 space-y-3 bg-muted/30 p-3 rounded-2xl border">
            <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} className="w-full bg-background p-2 rounded-xl border font-bold text-sm" />
            <textarea value={draftContent} onChange={(e) => setDraftContent(e.target.value)} className="w-full bg-background p-2 rounded-xl border min-h-[100px] text-sm" />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="rounded-xl">Cancel</Button>
              <Button type="button" size="sm" onClick={async () => {
                setIsUpdating(true);
                try {
                  const res = await axios.patch(`/api/posts/${displayPost.id}`, { title: draftTitle, content: draftContent }, { headers: { Authorization: `Bearer ${token}` } });
                  setDisplayPost(res.data);
                  setIsEditing(false);
                  toast.success("Post updated!");
                } catch (e) { toast.error("Update failed"); } finally { setIsUpdating(false); }
              }} className="rounded-xl bg-primary text-primary-foreground font-bold">{isUpdating ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            {displayPost.title && (
              <h2 className="mb-2 text-lg sm:text-xl font-extrabold leading-snug hover:text-primary transition-colors">
                <Link href={`/post/${displayPost.id}`}>{displayPost.title}</Link>
              </h2>
            )}
            {displayPost.content && (
              displayPost.bgColorCard && BG_CARDS_MAP[displayPost.bgColorCard] ? (
                <div className={`my-3 flex items-center justify-center min-h-[220px] ${BG_CARDS_MAP[displayPost.bgColorCard]}`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{displayPost.content}</p>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed text-foreground/90 font-normal">
                  {displayPost.content}
                </p>
              )
            )}
          </div>
        )}

        {/* Poll Renderer */}
        {pollState && pollState.options && (
          <div className="my-4 bg-muted/40 p-4 rounded-2xl border space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm flex items-center gap-1.5"><BarChart2 className="h-4 w-4 text-blue-500" /> {pollState.question || "Poll"}</span>
              <span className="text-xs text-muted-foreground font-semibold">{totalPollVotes} total votes</span>
            </div>
            <div className="space-y-2">
              {pollState.options.map((opt: any, idx: number) => {
                const pct = Math.round(((opt.votes || 0) / (totalPollVotes || 1)) * 100);
                const isSelected = votedOptionIdx === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => handlePollVote(idx)}
                    className={`relative overflow-hidden rounded-xl border p-3 cursor-pointer transition-all ${
                      isSelected ? "border-primary bg-primary/10 shadow-sm font-bold" : "bg-background hover:bg-muted/80"
                    }`}
                  >
                    <div className="absolute left-0 top-0 bottom-0 bg-primary/15 transition-all duration-500" style={{ width: `${pct}%` }} />
                    <div className="relative z-10 flex items-center justify-between text-xs sm:text-sm">
                      <span className="flex items-center gap-2">
                        {isSelected ? <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" /> : <span className="h-4 w-4 rounded-full border border-muted-foreground flex-shrink-0" />}
                        <span>{opt.text}</span>
                      </span>
                      <span className="font-bold text-muted-foreground">{pct}% ({opt.votes || 0})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Media Attachments */}
        {displayPost.type === "IMAGE" && displayPost.imageUrl && (
          <div className="mb-4 overflow-hidden rounded-2xl border bg-black/5 flex justify-center">
            <img src={displayPost.imageUrl} alt={displayPost.title} className="max-h-[520px] w-full object-contain" />
          </div>
        )}

        {displayPost.type === "LINK" && displayPost.url && (
          <a
            href={displayPost.url}
            target="_blank"
            rel="noreferrer"
            className="mb-4 flex items-center justify-between gap-3 rounded-2xl border bg-muted/50 p-4 text-sm font-semibold text-primary hover:bg-muted transition-colors shadow-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <ExternalLink className="h-5 w-5 flex-shrink-0 text-blue-500" />
              <span className="truncate">{displayPost.url}</span>
            </div>
            <span className="text-xs bg-background px-3 py-1 rounded-full border">Visit Link ↗</span>
          </a>
        )}

        {/* Reaction Breakdown Counter */}
        <div className="flex items-center justify-between py-2 border-y text-xs text-muted-foreground font-semibold">
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white shadow-xs">👍</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow-xs">❤️</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white shadow-xs">😂</span>
            </div>
            <span>{Object.values(reactionCounts).reduce((a, b) => a + b, 0) + (myReaction ? 1 : 0)} reactions</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/post/${displayPost.id}`} className="hover:underline">{displayPost._count?.comments || 0} comments</Link>
            <span>•</span>
            <span>42 shares</span>
          </div>
        </div>

        {/* Interactive Actions Footer with 7-Emoji Hover Bar */}
        <div className="relative flex items-center justify-between pt-2">
          {/* Reaction Bar Popup */}
          <AnimatePresence>
            {showReactionBar && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: -45 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                onMouseLeave={() => setShowReactionBar(false)}
                className="absolute left-0 bottom-full mb-1 z-30 flex items-center gap-1 bg-card border rounded-full px-3 py-2 shadow-2xl"
              >
                {REACTIONS.map((r) => (
                  <button
                    key={r.type}
                    type="button"
                    onClick={() => handleReaction(r.type)}
                    className="text-2xl hover:scale-150 active:scale-125 transition-transform p-1 focus:outline-none"
                    title={r.label}
                  >
                    {r.emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            {/* Facebook Like / React Button */}
            <div
              className="relative"
              onMouseEnter={() => setShowReactionBar(true)}
            >
              <button
                type="button"
                onClick={() => handleReaction(myReaction ? myReaction : "LIKE")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs sm:text-sm transition-colors ${
                  myReaction ? currentReactionObj.color + " bg-primary/10" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className="text-base">{myReaction ? currentReactionObj.emoji : "👍"}</span>
                <span>{myReaction ? currentReactionObj.label : "Like"}</span>
              </button>
            </div>

            {/* Reddit Upvote/Downvote Pills */}
            <div className="flex items-center bg-muted/60 rounded-xl p-0.5 border">
              <button
                type="button"
                onClick={() => handleVote("UP")}
                disabled={isVoting}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  userVote === "UP" ? "bg-orange-500 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Upvote"
              >
                <ArrowBigUp className="h-4 w-4" />
                <span>{upvotes}</span>
              </button>
              <span className="h-4 w-px bg-border/60" />
              <button
                type="button"
                onClick={() => handleVote("DOWN")}
                disabled={isVoting}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  userVote === "DOWN" ? "bg-blue-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Downvote"
              >
                <ArrowBigDown className="h-4 w-4" />
                <span>{downvotes}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild className="rounded-xl font-bold text-xs sm:text-sm text-muted-foreground hover:bg-muted">
              <Link href={`/post/${displayPost.id}`}>
                <MessageSquare className="mr-1.5 h-4 w-4 text-green-500" />
                <span>Comment</span>
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="rounded-xl font-bold text-xs sm:text-sm text-muted-foreground hover:bg-muted"
              title="Share"
            >
              <Share2 className="mr-1.5 h-4 w-4 text-blue-500" />
              <span className="hidden sm:inline">Share</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className={`rounded-xl p-2 ${isSaved ? "text-primary" : "text-muted-foreground hover:bg-muted"}`}
              title="Save Post"
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
            </Button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
