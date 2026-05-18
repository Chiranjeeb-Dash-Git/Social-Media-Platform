"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  author: {
    id: string;
    username: string;
    image?: string | null;
    isVerified: boolean;
  };
  community: {
    id: string;
    name: string;
    icon?: string | null;
  };
  upvotes: number;
  downvotes: number;
  _count: {
    comments: number;
  };
  createdAt: string | Date;
};

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const { user, token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [displayPost, setDisplayPost] = useState(post);
  const [userVote, setUserVote] = useState<"UP" | "DOWN" | null>(null);
  const [upvotes, setUpvotes] = useState(post.upvotes);
  const [downvotes, setDownvotes] = useState(post.downvotes);
  const [isSaved, setIsSaved] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [relativeTime, setRelativeTime] = useState("Just now");
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [draftTitle, setDraftTitle] = useState(post.title);
  const [draftContent, setDraftContent] = useState(post.content ?? "");
  const canManagePost = user?.id === displayPost.author.id;

  const postUrl = useMemo(() => {
    if (typeof window === "undefined") return `/post/${post.id}`;
    return `${window.location.origin}/post/${displayPost.id}`;
  }, [displayPost.id]);

  useEffect(() => {
    setDisplayPost(post);
    setUpvotes(post.upvotes);
    setDownvotes(post.downvotes);
    setDraftTitle(post.title);
    setDraftContent(post.content ?? "");
    setIsDeleted(false);
  }, [post]);

  useEffect(() => {
    setRelativeTime(
      formatDistanceToNow(new Date(displayPost.createdAt), { addSuffix: true })
    );
  }, [displayPost.createdAt]);

  useEffect(() => {
    const savedPosts = JSON.parse(localStorage.getItem("savedPosts") ?? "[]") as
      | string[]
      | unknown;
    setIsSaved(Array.isArray(savedPosts) && savedPosts.includes(displayPost.id));
  }, [displayPost.id]);

  useEffect(() => {
    if (!canManagePost) {
      setIsEditing(false);
    }
  }, [canManagePost]);

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
      await queryClient.invalidateQueries(["posts"]);
    } catch (error) {
      toast.error(
        axios.isAxiosError<{ error?: string }>(error)
          ? error.response?.data?.error ?? "Vote failed"
          : "Vote failed"
      );
    } finally {
      setIsVoting(false);
    }
  };

  const handleSave = () => {
    const savedPosts = JSON.parse(localStorage.getItem("savedPosts") ?? "[]") as
      | string[]
      | unknown;
    const currentSavedPosts = Array.isArray(savedPosts) ? savedPosts : [];
    const nextSavedPosts = currentSavedPosts.includes(displayPost.id)
      ? currentSavedPosts.filter((id) => id !== displayPost.id)
      : [...currentSavedPosts, displayPost.id];

    localStorage.setItem("savedPosts", JSON.stringify(nextSavedPosts));
    setIsSaved(nextSavedPosts.includes(displayPost.id));
    toast.success(
      nextSavedPosts.includes(displayPost.id) ? "Post saved." : "Post removed."
    );
  };

  const copyPostLink = async () => {
    await navigator.clipboard.writeText(postUrl);
    toast.success("Link copied.");
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: displayPost.title,
        text: displayPost.content ?? "",
        url: postUrl,
      });
      return;
    }

    await copyPostLink();
  };

  const cancelEditing = () => {
    setDraftTitle(displayPost.title);
    setDraftContent(displayPost.content ?? "");
    setIsEditing(false);
  };

  const handleUpdatePost = async () => {
    const title = draftTitle.trim();

    if (!title) {
      toast.error("Post title is required.");
      return;
    }

    setIsUpdating(true);

    try {
      const response = await axios.patch<Post>(
        `/api/posts/${displayPost.id}`,
        {
          title,
          content: draftContent.trim(),
        },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );

      setDisplayPost(response.data);
      setDraftTitle(response.data.title);
      setDraftContent(response.data.content ?? "");
      setIsEditing(false);
      await queryClient.invalidateQueries(["posts"]);
      router.refresh();
      toast.success("Post updated.");
    } catch (error) {
      toast.error(
        axios.isAxiosError<{ error?: string }>(error)
          ? error.response?.data?.error ?? "Failed to update post"
          : "Failed to update post"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;

    setIsDeleting(true);

    try {
      await axios.delete(
        `/api/posts/${displayPost.id}`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );

      setIsDeleted(true);
      await queryClient.invalidateQueries(["posts"]);
      await queryClient.invalidateQueries(["communities"]);
      toast.success("Post deleted.");

      if (window.location.pathname === `/post/${displayPost.id}`) {
        router.push("/");
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.error(
        axios.isAxiosError<{ error?: string }>(error)
          ? error.response?.data?.error ?? "Failed to delete post"
          : "Failed to delete post"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (isDeleted) return null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="cinematic-card hover-lift"
    >
      <div className="p-4">
        <div className="mb-3 flex items-start space-x-3">
          <Avatar
            src={displayPost.author.image}
            alt={displayPost.author.username}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link
                href={`/u/${displayPost.author.username}`}
                className="text-sm font-medium hover:underline"
              >
                u/{displayPost.author.username}
              </Link>
              {displayPost.author.isVerified && (
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500">
                  <span className="text-[10px] font-bold text-white">V</span>
                </div>
              )}
              <span className="text-xs text-muted-foreground">-</span>
              <Link
                href={`/r/${displayPost.community.name}`}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                r/{displayPost.community.name}
              </Link>
            </div>
            <div className="text-xs text-muted-foreground">{relativeTime}</div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                aria-label="Post actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/post/${displayPost.id}`} className="flex items-center">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open post
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyPostLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copy link
              </DropdownMenuItem>
              {canManagePost && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setDraftTitle(displayPost.title);
                      setDraftContent(displayPost.content ?? "");
                      setIsEditing(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit post
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDeletePost}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? "Deleting..." : "Delete post"}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isEditing ? (
          <div className="mb-3 space-y-3">
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              className="cinematic-input"
              maxLength={300}
            />
            <textarea
              value={draftContent}
              onChange={(event) => setDraftContent(event.target.value)}
              className="cinematic-input min-h-[110px] resize-none"
              maxLength={2000}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancelEditing}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="cinematic-button"
                onClick={handleUpdatePost}
                disabled={isUpdating || !draftTitle.trim()}
              >
                {isUpdating ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="mb-2 text-lg font-semibold transition-colors hover:text-primary">
              <Link href={`/post/${displayPost.id}`}>{displayPost.title}</Link>
            </h2>

            {displayPost.content && (
              <p className="mb-3 whitespace-pre-wrap text-sm text-muted-foreground">
                {displayPost.content}
              </p>
            )}
          </>
        )}

        {displayPost.type === "IMAGE" && displayPost.imageUrl && (
          <img
            src={displayPost.imageUrl}
            alt={displayPost.title}
            className="mb-3 max-h-[480px] w-full rounded-lg border border-[hsl(var(--border))] object-contain"
          />
        )}

        {displayPost.type === "LINK" && displayPost.url && (
          <a
            href={displayPost.url}
            target="_blank"
            rel="noreferrer"
            className="mb-3 flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-sm text-primary hover:bg-muted"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="truncate">{displayPost.url}</span>
          </a>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVote("UP")}
              disabled={isVoting}
              className={`vote-button upvote ${userVote === "UP" ? "active" : ""}`}
              aria-label="Like"
            >
              <ArrowBigUp className="h-4 w-4" />
              <span>{upvotes}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVote("DOWN")}
              disabled={isVoting}
              className={`vote-button downvote ${userVote === "DOWN" ? "active" : ""}`}
              aria-label="Dislike"
            >
              <ArrowBigDown className="h-4 w-4" />
              <span>{downvotes}</span>
            </Button>
          </div>

          <Button variant="ghost" size="sm" className="vote-button" asChild>
            <Link href={`/post/${displayPost.id}`}>
              <MessageSquare className="h-4 w-4" />
              <span>{displayPost._count.comments}</span>
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="vote-button"
            aria-label="Share post"
          >
            <Share2 className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className={`vote-button ${isSaved ? "text-primary" : ""}`}
            aria-label="Save post"
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
          </Button>

          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <Eye className="h-3 w-3" />
            <span>1.2K</span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
