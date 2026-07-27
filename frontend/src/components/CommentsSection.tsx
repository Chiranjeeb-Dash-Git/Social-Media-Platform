"use client";

import { useState } from "react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import { MessageSquare, Send, Image as ImageIcon, Sparkles, ThumbsUp, Heart, Smile, Reply, CornerDownRight } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";

type Comment = {
  id: string;
  postId: string;
  content: string;
  parentId?: string | null;
  mediaUrl?: string | null;
  gifUrl?: string | null;
  createdAt: string | Date;
  author: {
    id: string;
    username: string;
    image?: string | null;
  };
  replies?: Comment[];
};

const GIF_SAMPLES = [
  { label: "Applause 👏", url: "https://media.giphy.com/media/l3q2Z6S6n38zjPswo/giphy.gif" },
  { label: "Mind Blown 🤯", url: "https://media.giphy.com/media/26ufdipQqB2lhNA4g/giphy.gif" },
  { label: "Laughing 😂", url: "https://media.giphy.com/media/ZqlvCTNHpqri/giphy.gif" },
  { label: "Dance 💃", url: "https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif" },
];

export function CommentsSection({ postId }: { postId: string }) {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [gifUrl, setGifUrl] = useState("");
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentReactions, setCommentReactions] = useState<Record<string, { like: number; myLike: boolean }>>({});

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const response = await axios.get<Comment[]>("/api/comments", {
        params: { postId },
      });
      return response.data;
    },
  });

  // Build tree of comments
  const rootComments = comments.filter((c) => !c.parentId);
  const getReplies = (parentId: string) => comments.filter((c) => c.parentId === parentId);

  const handleCommentReaction = async (commentId: string) => {
    if (!token || !user) {
      toast.error("Log in to like comments");
      return;
    }
    setCommentReactions(prev => {
      const cur = prev[commentId] || { like: 1, myLike: false };
      return {
        ...prev,
        [commentId]: {
          like: cur.myLike ? Math.max(0, cur.like - 1) : cur.like + 1,
          myLike: !cur.myLike
        }
      };
    });
    try {
      await axios.post("/api/reactions", { commentId, type: "LIKE" }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {}
  };

  const submitComment = async (event: React.FormEvent, parentId?: string) => {
    event.preventDefault();
    const text = (parentId ? replyContent : content).trim();
    if (!text && !mediaUrl && !gifUrl) {
      toast.error("Write a comment or select an attachment.");
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(
        "/api/comments",
        {
          postId,
          content: text,
          parentId: parentId || undefined,
          mediaUrl: (!parentId && mediaUrl) ? mediaUrl : undefined,
          gifUrl: (!parentId && gifUrl) ? gifUrl : undefined,
        },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );

      if (parentId) {
        setReplyContent("");
        setReplyingToId(null);
      } else {
        setContent("");
        setMediaUrl("");
        setGifUrl("");
        setShowGifPicker(false);
      }

      await queryClient.invalidateQueries(["comments", postId]);
      await queryClient.invalidateQueries(["posts"]);
      toast.success(parentId ? "Reply posted!" : "Comment posted!");
    } catch (error) {
      toast.error("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCommentNode = (comment: Comment, isReply = false) => {
    const replies = getReplies(comment.id);
    const reactInfo = commentReactions[comment.id] || { like: Math.floor(comment.content.length % 5) || 1, myLike: false };

    return (
      <div key={comment.id} className={`flex flex-col ${isReply ? "ml-8 sm:ml-12 mt-3 pl-3 border-l-2 border-primary/30" : "mt-4"}`}>
        <article className="flex items-start gap-3 bg-muted/30 p-3.5 rounded-2xl border transition-colors hover:bg-muted/50">
          <Avatar src={comment.author.image ?? undefined} alt={comment.author.username} size={isReply ? "sm" : "md"} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-extrabold text-xs sm:text-sm text-foreground hover:underline cursor-pointer">
                u/{comment.author.username}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
            </div>

            {comment.content && (
              <p className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-foreground/90 mt-1 font-normal">
                {comment.content}
              </p>
            )}

            {comment.mediaUrl && (
              <img src={comment.mediaUrl} alt="attachment" className="mt-2 max-h-48 rounded-xl object-contain border" />
            )}
            {comment.gifUrl && (
              <img src={comment.gifUrl} alt="GIF" className="mt-2 max-h-40 rounded-xl object-cover shadow-sm" />
            )}

            {/* Comment Actions Bar */}
            <div className="flex items-center gap-4 mt-2 pt-1 text-xs font-bold text-muted-foreground">
              <button
                type="button"
                onClick={() => handleCommentReaction(comment.id)}
                className={`flex items-center gap-1 hover:text-primary transition-colors ${reactInfo.myLike ? "text-blue-600 font-extrabold" : ""}`}
              >
                <span>👍</span>
                <span>{reactInfo.like > 0 ? reactInfo.like : "Like"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setReplyingToId(replyingToId === comment.id ? null : comment.id);
                  setReplyContent("");
                }}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Reply className="h-3 w-3" />
                <span>Reply</span>
              </button>
            </div>

            {/* Inline Reply Composer */}
            {replyingToId === comment.id && (
              <form onSubmit={(e) => submitComment(e, comment.id)} className="mt-3 flex items-center gap-2 animate-in fade-in-50">
                <input
                  type="text"
                  placeholder={`Reply to u/${comment.author.username}...`}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="flex-1 h-8 rounded-full bg-background border px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <Button type="submit" size="sm" disabled={isSubmitting || !replyContent.trim()} className="h-8 px-3 rounded-full text-xs bg-primary text-primary-foreground">
                  Send
                </Button>
              </form>
            )}
          </div>
        </article>

        {/* Nested Replies */}
        {replies.map((reply) => renderCommentNode(reply, true))}
      </div>
    );
  };

  return (
    <section className="bg-card text-card-foreground rounded-3xl border p-6 shadow-md mt-6">
      <div className="mb-5 flex items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-gradient">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Discussion & Reactions
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {user ? `Commenting as u/${user.username}` : "Commenting as guest member"}
          </p>
        </div>
        <span className="rounded-full bg-primary/10 text-primary font-bold px-3 py-1 text-xs">
          {comments.length} Comments
        </span>
      </div>

      {/* Main Comment Composer */}
      <form onSubmit={(e) => submitComment(e)} className="space-y-3 bg-muted/20 p-4 rounded-2xl border">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment, attach photos or GIFs..."
          className="w-full bg-background rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[90px] resize-none border"
          maxLength={1000}
        />

        {/* Attachment Previews */}
        {mediaUrl && (
          <div className="relative inline-block border rounded-xl overflow-hidden p-1 bg-background">
            <img src={mediaUrl} alt="preview" className="h-20 w-auto rounded-lg object-cover" />
            <button type="button" onClick={() => setMediaUrl("")} className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5 text-[10px]">✕</button>
          </div>
        )}
        {gifUrl && (
          <div className="relative inline-block border rounded-xl overflow-hidden p-1 bg-background">
            <img src={gifUrl} alt="GIF preview" className="h-20 w-auto rounded-lg object-cover" />
            <button type="button" onClick={() => setGifUrl("")} className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5 text-[10px]">✕</button>
          </div>
        )}

        {/* GIF Picker Dropdown */}
        {showGifPicker && (
          <div className="p-3 bg-card border rounded-xl grid grid-cols-2 gap-2 shadow-lg animate-in fade-in-50">
            <div className="col-span-2 text-xs font-bold text-muted-foreground flex justify-between">
              <span>Choose GIF:</span>
              <button type="button" onClick={() => setShowGifPicker(false)} className="hover:text-foreground">✕</button>
            </div>
            {GIF_SAMPLES.map((g, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setGifUrl(g.url); setShowGifPicker(false); }}
                className="flex items-center justify-center p-2 rounded-lg bg-muted text-xs font-bold hover:bg-primary/20 transition-colors"
              >
                {g.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const u = prompt("Enter Image URL:");
                if (u) setMediaUrl(u);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background border text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
              <span>Photo</span>
            </button>
            <button
              type="button"
              onClick={() => setShowGifPicker(!showGifPicker)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background border text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
              <span>GIF</span>
            </button>
          </div>

          <Button
            type="submit"
            size="sm"
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 shadow-sm"
            disabled={isSubmitting || (!content.trim() && !mediaUrl && !gifUrl)}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {isSubmitting ? "Posting..." : "Comment"}
          </Button>
        </div>
      </form>

      {/* Comments List */}
      <div className="mt-6 space-y-2">
        {isLoading && <div className="p-8 text-center text-sm text-muted-foreground">Loading comments...</div>}
        {!isLoading && rootComments.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground border border-dashed rounded-2xl">
            No comments yet. Be the first to share your reaction!
          </div>
        )}
        {rootComments.map((comment) => renderCommentNode(comment))}
      </div>
    </section>
  );
}
