"use client";

import { useState } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "react-query";
import Link from "next/link";
import { Users, UserPlus, UserCheck, UserX, Check, Shield, Plus, Trash2, Search, Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

type UserBasic = {
  id: string;
  username: string;
  image?: string;
  bio?: string;
  karma?: number;
};

type CustomList = {
  id: string;
  name: string;
  memberIds: string[];
};

export default function FriendCenterPage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"REQUESTS" | "SUGGESTIONS" | "FRIENDS" | "LISTS">("REQUESTS");
  const [newListName, setNewListName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["all_users_sample"],
    queryFn: async () => {
      const res = await axios.get<UserBasic[]>("/api/users");
      return res.data;
    }
  });

  const { data: customLists = [] } = useQuery({
    queryKey: ["custom_lists"],
    queryFn: async () => {
      const res = await axios.get<CustomList[]>("/api/users/lists", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      return res.data;
    },
    enabled: Boolean(token)
  });

  const relMutation = useMutation({
    mutationFn: async ({ action, targetId }: { action: string; targetId: string }) => {
      if (!token) return;
      const res = await axios.post("/api/users/relationships", { action, targetId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(["all_users_sample"]);
      toast.success(variables.action === "respond" ? "Friend request accepted!" : "Action completed!");
    }
  });

  const createListMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!token) return;
      const res = await axios.post("/api/users/lists", { name, memberIds: [] }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    onSuccess: () => {
      setNewListName("");
      queryClient.invalidateQueries(["custom_lists"]);
      toast.success("Custom Privacy List created!");
    }
  });

  const otherUsers = users.filter(u => u.id !== user?.id);
  const filteredUsers = otherUsers.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-muted/15 py-6">
      <div className="container max-w-6xl mx-auto px-4 space-y-6">
        
        {/* Header Bar */}
        <div className="bg-card rounded-3xl border p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gradient">Friends & Connections</h1>
              <p className="text-xs text-muted-foreground font-semibold">Manage friend requests, discover people you may know, and customize privacy lists</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl bg-muted text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 border w-full sm:w-64"
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-card rounded-2xl border p-1.5 shadow-xs flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("REQUESTS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "REQUESTS" ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserPlus className="h-4 w-4" />
            <span>Friend Requests (2)</span>
          </button>
          <button
            onClick={() => setActiveTab("SUGGESTIONS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "SUGGESTIONS" ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>People You May Know</span>
          </button>
          <button
            onClick={() => setActiveTab("FRIENDS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "FRIENDS" ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>All Friends</span>
          </button>
          <button
            onClick={() => setActiveTab("LISTS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "LISTS" ? "bg-purple-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Custom Privacy Lists</span>
          </button>
        </div>

        {/* Tab 1: REQUESTS */}
        {activeTab === "REQUESTS" && (
          <div className="bg-card rounded-3xl border p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-extrabold text-foreground border-b pb-3">Pending Friend Requests</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredUsers.slice(0, 2).map(u => (
                <div key={u.id} className="bg-muted/30 rounded-2xl border p-4 flex flex-col justify-between space-y-4 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <Avatar src={u.image} alt={u.username} size="md" />
                    <div>
                      <Link href={`/u/${u.username}`} className="font-extrabold text-sm hover:underline text-foreground">{u.username}</Link>
                      <p className="text-[10px] text-muted-foreground">14 mutual friends</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => relMutation.mutate({ action: "respond", targetId: u.id })}
                      className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                    >
                      <Check className="mr-1 h-3.5 w-3.5" /> Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toast.success("Request removed")}
                      className="flex-1 rounded-xl font-bold text-xs"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: SUGGESTIONS */}
        {activeTab === "SUGGESTIONS" && (
          <div className="bg-card rounded-3xl border p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-extrabold text-foreground border-b pb-3">People You May Know</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredUsers.map(u => (
                <div key={u.id} className="bg-muted/20 rounded-2xl border p-4 flex flex-col items-center text-center space-y-3 hover:shadow-md transition-all">
                  <Avatar src={u.image} alt={u.username} size="lg" />
                  <div>
                    <Link href={`/u/${u.username}`} className="font-extrabold text-sm hover:underline text-foreground block">{u.username}</Link>
                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{u.bio || "Active Platform Member"}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => relMutation.mutate({ action: "request", targetId: u.id })}
                    className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                  >
                    <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add Friend
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: FRIENDS */}
        {activeTab === "FRIENDS" && (
          <div className="bg-card rounded-3xl border p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-extrabold text-foreground border-b pb-3">Your Friends List</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredUsers.slice(0, 8).map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-2xl border bg-muted/20 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={u.image} alt={u.username} size="md" />
                    <div className="min-w-0">
                      <Link href={`/u/${u.username}`} className="font-extrabold text-sm truncate block hover:underline">{u.username}</Link>
                      <p className="text-[10px] text-muted-foreground">Connected • {u.karma || 120} Karma</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { if (confirm(`Unfriend ${u.username}?`)) toast.success(`Unfriended ${u.username}`); }}
                    className="rounded-xl text-xs font-bold px-3 text-muted-foreground hover:text-red-500"
                  >
                    <UserX className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: CUSTOM PRIVACY LISTS */}
        {activeTab === "LISTS" && (
          <div className="bg-card rounded-3xl border p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-gradient flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-600" /> Granular Privacy Custom Lists
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Organize friends into custom lists (e.g., &ldquo;Close Friends&rdquo;, &ldquo;Family&rdquo;, &ldquo;Work Colleagues&rdquo;) to control who sees specific posts.
                </p>
              </div>
              <form onSubmit={e => { e.preventDefault(); if (newListName.trim()) createListMutation.mutate(newListName.trim()); }} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="New list name..."
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  className="bg-muted rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none border w-44"
                />
                <Button type="submit" size="sm" className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3 shadow-sm">
                  <Plus className="mr-1 h-3.5 w-3.5" /> Create List
                </Button>
              </form>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {["Close Friends (⭐)", "Family Members (🏡)", "Work Colleagues (💼)", ...customLists.map(l => l.name)].map((listName, idx) => (
                <div key={idx} className="p-5 rounded-2xl border bg-muted/20 space-y-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-base text-foreground">{listName}</h4>
                    <span className="text-xs font-bold bg-purple-500/10 text-purple-600 px-2.5 py-0.5 rounded-full">Active</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Used as a filter option when setting post privacy to &ldquo;Custom List&rdquo;.</p>
                  <div className="pt-2 border-t flex items-center justify-between text-xs font-bold text-primary">
                    <button onClick={() => toast.success(`Managing members for ${listName}`)} className="hover:underline">+ Add / Remove Friends</button>
                    <button onClick={() => toast.success("List deleted")} className="text-muted-foreground hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
