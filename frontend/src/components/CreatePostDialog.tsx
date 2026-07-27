"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from "react-query";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import {
  X, Image as ImageIcon, Link as LinkIcon, Type, Globe, Users, Lock,
  Smile, MapPin, Palette, BarChart2, Video, Plus, Trash2, Check
} from "lucide-react";

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

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const BG_CARDS = [
  { id: "none", label: "Normal", class: "" },
  { id: "grad-blue", label: "Ocean", class: "bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-extrabold text-xl p-8 text-center rounded-2xl shadow-inner" },
  { id: "grad-fire", label: "Sunset", class: "bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white font-extrabold text-xl p-8 text-center rounded-2xl shadow-inner" },
  { id: "grad-purple", label: "Neon", class: "bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white font-extrabold text-xl p-8 text-center rounded-2xl shadow-inner" },
  { id: "grad-emerald", label: "Forest", class: "bg-gradient-to-r from-emerald-600 to-teal-800 text-white font-extrabold text-xl p-8 text-center rounded-2xl shadow-inner" },
  { id: "dark-card", label: "Midnight", class: "bg-slate-900 border border-slate-700 text-amber-400 font-extrabold text-xl p-8 text-center rounded-2xl shadow-inner" },
];

const FEELINGS = [
  { label: "Happy 😊", val: "feeling Happy 😊" },
  { label: "Excited 🎉", val: "feeling Excited 🎉" },
  { label: "Blessed 😇", val: "feeling Blessed 😇" },
  { label: "Loved ❤️", val: "feeling Loved ❤️" },
  { label: "Motivated 🚀", val: "feeling Motivated 🚀" },
  { label: "Relaxed ☕", val: "feeling Relaxed ☕" },
];

interface CreatePostDialogProps {
  onClose: () => void;
  onCreated?: (post: CreatedPost) => void;
}

export function CreatePostDialog({ onClose, onCreated }: CreatePostDialogProps) {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [postType, setPostType] = useState<PostType>("TEXT");
  const [selectedCommunityId, setSelectedCommunityId] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Facebook feature states
  const [privacy, setPrivacy] = useState<"PUBLIC" | "FRIENDS" | "ONLY_ME">("PUBLIC");
  const [feelingActivity, setFeelingActivity] = useState("");
  const [locationTag, setLocationTag] = useState("");
  const [bgColorCard, setBgColorCard] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["Option 1", "Option 2"]);

  const { data: communities = [] } = useQuery({
    queryKey: ["communities"],
    queryFn: async () => {
      const response = await axios.get<Community[]>("/api/communities");
      return response.data;
    },
  });

  const selectedCommunity =
    communities.find((c) => c.id === selectedCommunityId) ?? communities[0];

  const readImageFile = (file: File) => {
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Choose an image smaller than 3 MB.");
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

  const handleAddPollOption = () => {
    if (pollOptions.length < 5) {
      setPollOptions([...pollOptions, `Option ${pollOptions.length + 1}`]);
    }
  };

  const handleRemovePollOption = (idx: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== idx));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedCommunity) {
      toast.error("Choose a community or target feed first.");
      return;
    }
    if (!title.trim() && !content.trim()) {
      toast.error("Add text or title before posting.");
      return;
    }
    if (postType === "LINK" && !url.trim()) {
      toast.error("Add a link URL before posting.");
      return;
    }
    if (postType === "IMAGE" && !imageUrl) {
      toast.error("Choose an image before posting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const pollData = showPoll && pollOptions.filter(o => o.trim()).length >= 2 ? {
        question: pollQuestion.trim() || title.trim() || "Poll",
        options: pollOptions.filter(o => o.trim()).map(o => ({ text: o.trim(), votes: 0, voters: [] }))
      } : undefined;

      const response = await axios.post<CreatedPost>(
        "/api/posts",
        {
          title: title.trim() || (content.slice(0, 40) + "..."),
          content: content.trim(),
          type: postType,
          url: postType === "LINK" ? url.trim() : undefined,
          imageUrl: postType === "IMAGE" ? imageUrl : undefined,
          communityId: selectedCommunity.id,
          privacy,
          feelingActivity: feelingActivity || undefined,
          locationTag: locationTag.trim() || undefined,
          bgColorCard: bgColorCard || undefined,
          isLive,
          pollData
        },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );

      queryClient.invalidateQueries(["posts"]);
      queryClient.invalidateQueries(["communities"]);
      toast.success(isLive ? "🔴 Live Stream Post Broadcasted!" : "✨ Post published to timeline!");
      onCreated?.(response.data);
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

  const getPrivacyIcon = () => {
    if (privacy === "FRIENDS") return <Users className="h-3.5 w-3.5 text-blue-500" />;
    if (privacy === "ONLY_ME") return <Lock className="h-3.5 w-3.5 text-amber-500" />;
    return <Globe className="h-3.5 w-3.5 text-green-500" />;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="bg-card text-card-foreground w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl flex flex-col"
          onClick={(event) => event.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4 bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-gradient">Create Post</h2>
              {isLive && <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-bold text-xs animate-pulse">LIVE 🔴</span>}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-full hover:bg-muted" aria-label="Close">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* User Info & Privacy Selector */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-lg">
                  {user?.username?.[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                    {user?.username || "Guest Member"}
                    {feelingActivity && <span className="font-normal text-muted-foreground text-xs">— {feelingActivity}</span>}
                  </h4>
                  {locationTag && <span className="text-[11px] text-blue-500 font-semibold flex items-center gap-0.5 mt-0.5"><MapPin className="h-3 w-3" /> at {locationTag}</span>}
                </div>
              </div>

              {/* Privacy Dropdown */}
              <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer">
                {getPrivacyIcon()}
                <select
                  value={privacy}
                  onChange={(e: any) => setPrivacy(e.target.value)}
                  className="bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="PUBLIC">Public</option>
                  <option value="FRIENDS">Friends Only</option>
                  <option value="ONLY_ME">Only Me</option>
                </select>
              </div>
            </div>

            {/* Target Community / Group */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Post Destination / Group
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {communities.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCommunityId(c.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCommunityId === c.id
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-muted/40 hover:bg-muted"
                    }`}
                  >
                    <span>r/{c.name}</span>
                    {selectedCommunityId === c.id && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Post Type Selector */}
            <div className="flex items-center gap-2 border-y py-2.5">
              {[
                { type: "TEXT", icon: Type, label: "Text / Status" },
                { type: "IMAGE", icon: ImageIcon, label: "Photo / Video" },
                { type: "LINK", icon: LinkIcon, label: "Link URL" },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setPostType(item.type as PostType)}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                    postType === item.type
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Title Input */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's on your mind? (Headline / Title)"
                className="w-full bg-transparent font-extrabold text-lg placeholder:text-muted-foreground/60 focus:outline-none border-b pb-2"
                maxLength={300}
              />
            </div>

            {/* Text Post Content & Colored Card Preview */}
            {postType === "TEXT" && (
              <div className="space-y-3">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`Share your thoughts, stories or questions...`}
                  className={`w-full min-h-[140px] rounded-2xl p-4 text-sm focus:outline-none transition-all ${
                    bgColorCard ? BG_CARDS.find(b => b.id === bgColorCard)?.class : "bg-muted/40 border focus:border-primary/50"
                  }`}
                  maxLength={2000}
                />
                {/* Background Cards Palette */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-xs font-bold text-muted-foreground flex items-center gap-1"><Palette className="h-3.5 w-3.5" /> Card:</span>
                  {BG_CARDS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBgColorCard(b.id === "none" ? "" : b.id)}
                      className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-transform active:scale-95 ${
                        b.id === "none" ? "bg-muted border text-foreground" : b.class.replace("p-8 text-xl text-center", "py-1 px-2")
                      } ${bgColorCard === b.id ? "ring-2 ring-primary ring-offset-2" : ""}`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Image Upload */}
            {postType === "IMAGE" && (
              <div>
                <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50 bg-muted/20">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Selected" className="mx-auto max-h-64 rounded-xl object-contain shadow-md" />
                  ) : (
                    <>
                      <ImageIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                      <p className="mb-2 text-sm font-semibold text-foreground">Click to upload image or photo</p>
                      <span className="inline-flex h-9 items-center rounded-xl bg-primary text-primary-foreground px-4 text-xs font-bold">Choose File</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) readImageFile(f); }} />
                </label>
              </div>
            )}

            {/* Link URL */}
            {postType === "LINK" && (
              <div>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full rounded-xl border bg-muted/40 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            )}

            {/* Poll Creator */}
            {showPoll && (
              <div className="bg-muted/50 p-4 rounded-2xl border space-y-3 animate-in fade-in-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5"><BarChart2 className="h-4 w-4 text-blue-500" /> Community Poll</span>
                  <button type="button" onClick={() => setShowPoll(false)} className="text-xs text-red-500 hover:underline font-semibold">Remove Poll</button>
                </div>
                <input
                  type="text"
                  placeholder="Poll Question / Topic..."
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-xs font-bold"
                />
                <div className="space-y-2">
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const n = [...pollOptions];
                          n[i] = e.target.value;
                          setPollOptions(n);
                        }}
                        placeholder={`Option ${i + 1}`}
                        className="flex-1 rounded-xl border bg-background px-3 py-1.5 text-xs"
                      />
                      {pollOptions.length > 2 && (
                        <button type="button" onClick={() => handleRemovePollOption(i)} className="p-1.5 text-muted-foreground hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 5 && (
                    <button type="button" onClick={handleAddPollOption} className="text-xs font-bold text-primary flex items-center gap-1 mt-1 hover:underline">
                      <Plus className="h-3 w-3" /> Add Option
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Facebook Add-On Actions Bar */}
            <div className="bg-muted/30 border rounded-2xl p-3 flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-muted-foreground">Add to your post:</span>
              <div className="flex items-center gap-1 flex-wrap">
                {/* Feeling / Activity */}
                <select
                  value={feelingActivity}
                  onChange={(e) => setFeelingActivity(e.target.value)}
                  className="bg-background border rounded-xl px-2.5 py-1 text-xs font-semibold cursor-pointer hover:border-primary transition-colors"
                >
                  <option value="">😀 Feeling...</option>
                  {FEELINGS.map(f => <option key={f.val} value={f.val}>{f.label}</option>)}
                </select>

                {/* Location Check-In */}
                <button
                  type="button"
                  onClick={() => {
                    const loc = prompt("Enter location name (e.g. Paris, New York, Tokyo):", locationTag || "Silicon Valley");
                    if (loc !== null) setLocationTag(loc);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-colors ${
                    locationTag ? "bg-blue-500/10 text-blue-500 border-blue-500/30" : "bg-background hover:bg-muted"
                  }`}
                  title="Check in location"
                >
                  <MapPin className="h-3.5 w-3.5 text-red-500" />
                  <span>{locationTag ? locationTag.slice(0, 12) + "..." : "Check in"}</span>
                </button>

                {/* Poll Toggle */}
                <button
                  type="button"
                  onClick={() => setShowPoll(!showPoll)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-colors ${
                    showPoll ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-background hover:bg-muted"
                  }`}
                >
                  <BarChart2 className="h-3.5 w-3.5 text-amber-500" />
                  <span>Poll</span>
                </button>

                {/* Live Stream Toggle */}
                <button
                  type="button"
                  onClick={() => setIsLive(!isLive)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-colors ${
                    isLive ? "bg-red-500 text-white animate-pulse" : "bg-background hover:bg-muted"
                  }`}
                >
                  <Video className="h-3.5 w-3.5 text-red-500" />
                  <span>{isLive ? "LIVE 🔴" : "Live Video"}</span>
                </button>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting} className="rounded-xl font-bold">
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-md"
                disabled={(!title.trim() && !content.trim()) || isSubmitting}
              >
                {isSubmitting ? "Publishing..." : isLive ? "Go Live & Post" : "Publish Post"}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
