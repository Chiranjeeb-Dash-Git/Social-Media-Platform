"use client";

import { useState } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { ShoppingBag, Plus, Filter, MapPin, Tag, DollarSign, X, Check, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

type MarketplaceItem = {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  location: string;
  category: string;
  condition?: string;
  imageUrls: string[];
  createdAt: string;
};

const CATEGORIES = ["All", "Electronics", "Vehicles", "Property", "Apparel", "Hobbies", "Furniture"];

export default function MarketplacePage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [maxPrice, setMaxPrice] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [condition, setCondition] = useState("New");
  const [location, setLocation] = useState("Silicon Valley, CA");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["marketplace_items", selectedCategory, maxPrice],
    queryFn: async () => {
      let url = `/api/marketplace?category=${encodeURIComponent(selectedCategory)}`;
      if (maxPrice) url += `&maxPrice=${encodeURIComponent(maxPrice)}`;
      const res = await axios.get<MarketplaceItem[]>(url);
      return res.data;
    }
  });

  const handleImageFile = (file: File) => {
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Choose an image smaller than 3 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setImageUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !description) {
      toast.error("Please fill required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.post("/api/marketplace", {
        title,
        price: Number(price) || 0,
        category,
        condition,
        location,
        description,
        imageUrls: imageUrl ? [imageUrl] : ["https://images.unsplash.com/photo-1526738549149-8e07eca6c147"]
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      toast.success("Listing published to Marketplace!");
      setShowCreateModal(false);
      setTitle("");
      setPrice("");
      setDescription("");
      setImageUrl("");
      queryClient.invalidateQueries(["marketplace_items"]);
    } catch (err) {
      toast.error("Could not create listing");
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
            <div className="h-12 w-12 rounded-2xl bg-green-500/10 text-green-600 flex items-center justify-center">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gradient">SocialPulse Marketplace</h1>
              <p className="text-xs text-muted-foreground font-semibold">Buy, sell, and trade with members in your local community</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold px-5 shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> Create New Listing
          </Button>
        </div>

        {/* Category Filters & Price Filter */}
        <div className="bg-card rounded-2xl border p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategory === cat ? "bg-green-600 text-white shadow-sm" : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <input
              type="number"
              placeholder="Max price ($)"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              className="w-32 bg-muted rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-green-500 border"
            />
            {maxPrice && <button onClick={() => setMaxPrice("")} className="text-xs text-red-500 font-bold">Clear</button>}
          </div>
        </div>

        {/* Marketplace Items Grid */}
        {isLoading ? (
          <div className="p-16 text-center text-sm font-semibold text-muted-foreground bg-card rounded-3xl border">Loading marketplace items...</div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center space-y-3 bg-card rounded-3xl border">
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
            <h3 className="font-extrabold text-lg">No listings found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No items match the selected category or price range. Create a listing to be the first in this section!
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs mt-2">
              Create First Listing
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map(item => (
              <div key={item.id} className="bg-card rounded-3xl border shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col group">
                <div className="aspect-square w-full bg-slate-200 relative overflow-hidden">
                  <img
                    src={item.imageUrls?.[0] || "https://images.unsplash.com/photo-1526738549149-8e07eca6c147"}
                    alt={item.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 left-3 bg-black/70 text-white px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md">
                    {item.category}
                  </span>
                  {item.condition && (
                    <span className="absolute top-3 right-3 bg-green-600 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm">
                      {item.condition}
                    </span>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-extrabold text-base text-foreground truncate group-hover:text-green-600 transition-colors" title={item.title}>{item.title}</h3>
                      <span className="text-lg font-black text-green-600 whitespace-nowrap">${item.price}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 font-normal">{item.description}</p>
                  </div>
                  <div className="pt-3 border-t flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                    <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 text-red-500 flex-shrink-0" /> {item.location}</span>
                    <Button
                      size="sm"
                      onClick={() => toast("Opening Messenger chat with seller regarding " + item.title, { icon: "💬" })}
                      className="h-7 px-3 rounded-xl bg-muted text-foreground hover:bg-green-600 hover:text-white font-bold text-xs transition-colors"
                    >
                      Message Seller
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Create Listing Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md" onClick={() => setShowCreateModal(false)}>
          <div className="bg-card text-card-foreground w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-extrabold text-gradient flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-green-600" /> Create Marketplace Listing
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-full hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Title / Item Name</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Apple MacBook Pro M3 16-inch" className="w-full bg-muted rounded-xl p-2.5 text-sm font-bold focus:outline-none border" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Price ($ USD)</label>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 1499" className="w-full bg-muted rounded-xl p-2.5 text-sm font-bold focus:outline-none border" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-muted rounded-xl p-2.5 text-sm font-bold focus:outline-none border">
                    {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Condition</label>
                  <select value={condition} onChange={e => setCondition(e.target.value)} className="w-full bg-muted rounded-xl p-2.5 text-sm font-bold focus:outline-none border">
                    <option value="New">New / Sealed</option>
                    <option value="Like New">Like New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Location</label>
                  <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Seattle, WA" className="w-full bg-muted rounded-xl p-2.5 text-sm font-bold focus:outline-none border" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe item specs, history, reason for selling..." className="w-full bg-muted rounded-xl p-3 text-sm focus:outline-none border min-h-[90px]" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Photo Upload</label>
                <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-green-600 bg-muted/20">
                  {imageUrl ? (
                    <img src={imageUrl} alt="preview" className="mx-auto max-h-40 rounded-xl object-contain shadow-md" />
                  ) : (
                    <>
                      <ImageIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-xs font-semibold">Click to choose item photo</p>
                    </>
                  )}
                  <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} />
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)} className="rounded-xl font-bold">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold px-6 shadow-md">
                  {isSubmitting ? "Publishing..." : "Publish Listing"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
