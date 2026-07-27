"use client";

import { useState } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "react-query";
import Link from "next/link";
import { Tv, Plus, Users, ShieldCheck, Check, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

type CreatorPage = {
  id: string;
  name: string;
  category: string;
  description?: string;
  coverPhoto?: string;
  avatar?: string;
  ownerId: string;
  followers: number;
  createdAt: string;
};

export default function PagesDiscoveryPage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  // Create form states
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Public Figure");
  const [description, setDescription] = useState("");
  const [coverPhotoUrl, setCoverPhotoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["creator_pages"],
    queryFn: async () => {
      const res = await axios.get<CreatorPage[]>("/api/pages");
      return res.data;
    }
  });

  const handleFollowToggle = (pageId: string, pageName: string) => {
    setFollowingMap(prev => {
      const nextVal = !prev[pageId];
      toast.success(nextVal ? `Following ${pageName}` : `Unfollowed ${pageName}`);
      return { ...prev, [pageId]: nextVal };
    });
  };

  const handleImageFile = (file: File) => {
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Choose an image smaller than 3 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setCoverPhotoUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category) {
      toast.error("Name and category required");
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.post("/api/pages", {
        name,
        category,
        description,
        coverPhoto: coverPhotoUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      toast.success("Creator Page created successfully!");
      setShowCreateModal(false);
      setName("");
      setDescription("");
      setCoverPhotoUrl("");
      queryClient.invalidateQueries(["creator_pages"]);
    } catch (err) {
      toast.error("Could not create Page");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/15 py-6">
      <div className="container max-w-7xl mx-auto px-4 space-y-6">
        
        {/* Header Bar */}
        <div className="bg-card rounded-3xl border p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Tv className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gradient">Creator Pages & Watch</h1>
              <p className="text-xs text-muted-foreground font-semibold">Follow public figures, media organizations, brands, and video creators</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> Create New Page
          </Button>
        </div>

        {/* Creator Pages Grid */}
        {isLoading ? (
          <div className="p-16 text-center text-sm font-semibold text-muted-foreground bg-card rounded-3xl border">Loading creator pages...</div>
        ) : pages.length === 0 ? (
          <div className="p-16 text-center space-y-3 bg-card rounded-3xl border">
            <Tv className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
            <h3 className="font-extrabold text-lg">No Creator Pages yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Be the first to launch an official public Creator Page for your brand, gaming channel, or community organization!
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs mt-2">
              Launch First Page
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {pages.map(p => {
              const isFollowed = followingMap[p.id] || false;
              return (
                <div key={p.id} className="bg-card rounded-3xl border shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col group">
                  <Link href={`/pages/${p.id}`} className="block">
                    <div
                      className="h-32 w-full bg-slate-800 bg-cover bg-center relative"
                      style={{ backgroundImage: `url(${p.coverPhoto || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"})` }}
                    >
                      <span className="absolute top-3 right-3 bg-black/60 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md">
                        {p.category}
                      </span>
                    </div>
                  </Link>
                  <div className="p-5 pt-0 flex-1 flex flex-col justify-between space-y-4 -mt-8 relative z-10">
                    <div className="space-y-2">
                      <div className="flex items-end justify-between">
                        <Link href={`/pages/${p.id}`} className="h-16 w-16 rounded-2xl border-4 border-card bg-gradient-to-tr from-purple-600 to-pink-500 text-white font-black text-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                          {p.name?.[0]?.toUpperCase() || "P"}
                        </Link>
                        <span className="text-xs text-muted-foreground font-bold flex items-center gap-1 mb-1">
                          <Users className="h-3.5 w-3.5 text-purple-500" /> {(p.followers || 1).toLocaleString()} followers
                        </span>
                      </div>
                      <div>
                        <Link href={`/pages/${p.id}`} className="font-extrabold text-base text-foreground group-hover:text-purple-600 transition-colors flex items-center gap-1.5">
                          <span>{p.name}</span>
                          <ShieldCheck className="h-4 w-4 text-purple-500 flex-shrink-0" title="Verified Page" />
                        </Link>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 font-normal">{p.description || "Official Creator Page"}</p>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t flex items-center justify-between gap-2">
                      <Button asChild variant="outline" size="sm" className="flex-1 rounded-xl font-bold text-xs">
                        <Link href={`/pages/${p.id}`}>View Page</Link>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleFollowToggle(p.id, p.name)}
                        className={`flex-1 rounded-xl font-bold text-xs ${
                          isFollowed ? "bg-muted text-foreground border hover:bg-muted/80" : "bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                        }`}
                      >
                        {isFollowed ? <><Check className="mr-1.5 h-3.5 w-3.5 text-green-500" /> Following</> : "+ Follow Page"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Create Page Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md" onClick={() => setShowCreateModal(false)}>
          <div className="bg-card text-card-foreground w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-extrabold text-gradient flex items-center gap-2">
                <Tv className="h-5 w-5 text-purple-600" /> Create Creator Page
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-full hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Page Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Tech Radar Daily or Gaming HQ" className="w-full bg-muted rounded-xl p-2.5 text-sm font-bold focus:outline-none border" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Category / Type</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-muted rounded-xl p-2.5 text-sm font-bold focus:outline-none border">
                  <option value="Public Figure">Public Figure / Creator</option>
                  <option value="Media Organization">Media & News Organization</option>
                  <option value="Gaming & Esports">Gaming & Esports Channel</option>
                  <option value="Brand & Product">Brand & Commercial Product</option>
                  <option value="Entertainment">Entertainment & Watch Video</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Description / Bio</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this Page about?" className="w-full bg-muted rounded-xl p-3 text-sm focus:outline-none border min-h-[90px]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Cover Photo Banner</label>
                <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-purple-600 bg-muted/20">
                  {coverPhotoUrl ? (
                    <img src={coverPhotoUrl} alt="preview" className="mx-auto max-h-40 rounded-xl object-contain shadow-md" />
                  ) : (
                    <>
                      <ImageIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-xs font-semibold">Click to upload cover photo banner</p>
                    </>
                  )}
                  <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} />
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)} className="rounded-xl font-bold">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 shadow-md">
                  {isSubmitting ? "Creating..." : "Launch Creator Page"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
