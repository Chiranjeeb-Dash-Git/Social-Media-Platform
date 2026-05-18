"use client";

import { useState } from "react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import { MessageSquare, Send } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";

type Comment = {
  id: string;
  postId: string;
  content: string;
  createdAt: string | Date;
  author: {
    username: string;
    image?: string | null;
  };
};

export function CommentsSection({ postId }: { postId: string }) {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const response = await axios.get<Comment[]>("/api/comments", {
        params: { postId },
      });
      return response.data;
    },
  });

  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      toast.error("Write a comment first.");
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post(
        "/api/comments",
        {
          postId,
          content: trimmedContent,
        },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      setContent("");
      await queryClient.invalidateQueries(["comments", postId]);
      await queryClient.invalidateQueries(["posts"]);
      router.refresh();
      toast.success("Comment posted.");
    } catch (error) {
      toast.error(
        axios.isAxiosError<{ error?: string }>(error)
          ? error.response?.data?.error ?? "Failed to post comment"
          : "Failed to post comment"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="cinematic-card p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <MessageSquare className="h-5 w-5 text-primary" />
            Comments
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {user ? `Commenting as u/${user.username}` : "Commenting as guest"}
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {comments.length}
        </span>
      </div>

      <form onSubmit={submitComment} className="space-y-3">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Add to the discussion..."
          className="cinematic-input min-h-[110px] resize-none"
          maxLength={1000}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {content.length}/1000
          </span>
          <Button
            type="submit"
            className="cinematic-button"
            disabled={isSubmitting || !content.trim()}
          >
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? "Posting..." : "Comment"}
          </Button>
        </div>
      </form>

      <div className="mt-6 space-y-4">
        {isLoading && (
          <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
            Loading comments...
          </div>
        )}

        {!isLoading && comments.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No comments yet. Start the discussion.
          </div>
        )}

        {comments.map((comment) => (
          <article key={comment.id} className="rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center gap-3">
              <Avatar
                src={comment.author.image ?? undefined}
                alt={comment.author.username}
                size="sm"
              />
              <div>
                <div className="text-sm font-medium">
                  u/{comment.author.username}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.createdAt), {
                    addSuffix: true,
                  })}
                </div>
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {comment.content}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
