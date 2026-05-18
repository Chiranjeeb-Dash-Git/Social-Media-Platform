"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from "react-query";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { X, Image as ImageIcon, Link as LinkIcon, Type } from "lucide-react";

type PostType = "TEXT" | "IMAGE" | "LINK";

type Community = {
  id: string;
  name: string;
  icon?: string;
};

type CreatedPost = {
  id: string;
  title: string;
};

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

interface CreatePostDialogProps {
  onClose: () => void;
  onCreated?: (post: CreatedPost) => void;
}

export function CreatePostDialog({ onClose, onCreated }: CreatePostDialogProps) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [postType, setPostType] = useState<PostType>("TEXT");
  const [selectedCommunityId, setSelectedCommunityId] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: communities = [] } = useQuery({
    queryKey: ["communities"],
    queryFn: async () => {
      const response = await axios.get<Community[]>("/api/communities");
      return response.data;
    },
  });

  const selectedCommunity =
    communities.find((community) => community.id === selectedCommunityId) ??
    communities[0];

  const readImageFile = (file: File) => {
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Choose an image smaller than 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedCommunity) {
      toast.error("Choose a community first.");
      return;
    }

    if (postType === "LINK" && !url.trim()) {
      toast.error("Add a link before posting.");
      return;
    }

    if (postType === "IMAGE" && !imageUrl) {
      toast.error("Choose an image before posting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post<CreatedPost>(
        "/api/posts",
        {
          title: title.trim(),
          content: content.trim(),
          type: postType,
          url: postType === "LINK" ? url.trim() : undefined,
          imageUrl: postType === "IMAGE" ? imageUrl : undefined,
          communityId: selectedCommunity.id,
        },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );

      queryClient.invalidateQueries(["posts"]);
      queryClient.invalidateQueries(["communities"]);
      toast.success("Post created.");
      onCreated?.(response.data);
      setTitle("");
      setContent("");
      setUrl("");
      setImageUrl("");
      setPostType("TEXT");
      onClose();
    } catch (error) {
      console.error("Failed to create post:", error);
      toast.error(
        axios.isAxiosError<{ error?: string }>(error)
          ? error.response?.data?.error ?? "Failed to create post"
          : "Failed to create post"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="cinematic-card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b p-6">
            <h2 className="text-xl font-semibold text-gradient">Create a post</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            <div>
              <label className="mb-3 block text-sm font-medium">
                Choose a community
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {communities.map((community) => (
                  <button
                    key={community.id}
                    type="button"
                    onClick={() => setSelectedCommunityId(community.id)}
                    className={`rounded-lg border-2 p-3 transition-all duration-200 ${
                      selectedCommunityId === community.id
                        ? "border-primary bg-primary/10"
                        : "border-[hsl(var(--border))] hover:border-muted-foreground/40"
                    }`}
                  >
                    <div
                      className="mx-auto mb-2 h-8 w-8 rounded-full bg-muted bg-cover bg-center"
                      style={{
                        backgroundImage: community.icon
                          ? `url(${community.icon})`
                          : undefined,
                      }}
                    />
                    <div className="truncate text-sm font-medium">
                      c/{community.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium">Post type</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { type: "TEXT", icon: Type, label: "Text" },
                  { type: "IMAGE", icon: ImageIcon, label: "Image" },
                  { type: "LINK", icon: LinkIcon, label: "Link" },
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setPostType(item.type as PostType)}
                    className={`flex items-center space-x-2 rounded-lg border-2 px-4 py-2 transition-all duration-200 ${
                      postType === item.type
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="title" className="mb-2 block text-sm font-medium">
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Enter a compelling title..."
                className="cinematic-input"
                maxLength={300}
                required
              />
              <div className="mt-1 text-xs text-muted-foreground">
                {title.length}/300
              </div>
            </div>

            {postType === "TEXT" && (
              <div>
                <label
                  htmlFor="content"
                  className="mb-2 block text-sm font-medium"
                >
                  Text
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Write your thoughts here..."
                  className="cinematic-input min-h-[120px] resize-none"
                  maxLength={2000}
                  rows={6}
                />
                <div className="mt-1 text-xs text-muted-foreground">
                  {content.length}/2000
                </div>
              </div>
            )}

            {postType === "IMAGE" && (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Upload image
                </label>
                <label className="block cursor-pointer rounded-lg border-2 border-dashed border-[hsl(var(--border))] p-8 text-center transition-colors duration-200 hover:border-primary/50">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Selected post"
                      className="mx-auto max-h-56 rounded-lg object-contain"
                    />
                  ) : (
                    <>
                      <ImageIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                      <p className="mb-2 text-muted-foreground">
                        Click to choose an image from your computer
                      </p>
                      <span className="inline-flex h-10 items-center rounded-md border border-[hsl(var(--input))] px-4 text-sm font-medium">
                        Choose File
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) readImageFile(file);
                    }}
                  />
                </label>
              </div>
            )}

            {postType === "LINK" && (
              <div>
                <label htmlFor="url" className="mb-2 block text-sm font-medium">
                  URL
                </label>
                <input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com"
                  className="cinematic-input"
                  required
                />
              </div>
            )}

            <div className="flex justify-end space-x-3 border-t pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="cinematic-button"
                disabled={
                  !title.trim() ||
                  isSubmitting ||
                  (postType === "LINK" && !url.trim()) ||
                  (postType === "IMAGE" && !imageUrl)
                }
              >
                {isSubmitting ? (
                  <div className="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                ) : (
                  "Post"
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
