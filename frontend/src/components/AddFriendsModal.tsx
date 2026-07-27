"use client";

import { useState } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { X, UserPlus, Check, MessageCircle, Search, Users, Clock } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

type UserBasic = {
  id: string;
  username: string;
  image?: string;
  bio?: string;
  karma?: number;
};

export function AddFriendsModal({ onClose }: { onClose: () => void }) {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["all_webpage_users"],
    queryFn: async () => {
      const res = await axios.get<UserBasic[]>("/api/users");
      return res.data;
    }
  });

  const { data: friends = [] } = useQuery({
    queryKey: ["my_real_friends", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await axios.get<UserBasic[]>("/api/users/relationships?type=friends", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      return res.data;
    },
    enabled: Boolean(user)
  });

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["my_pending_requests", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await axios.get<any[]>("/api/users/relationships?type=pending", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      return res.data;
    },
    enabled: Boolean(user)
  });

  const [sentRequestIds, setSentRequestIds] = useState<string[]>([]);

  const relMutation = useMutation(
    async ({ action, targetId, requestId }: { action: string; targetId?: string; requestId?: string }) => {
      if (!token) throw new Error("Unauthorized");
      const res = await axios.post("/api/users/relationships", { action, targetId, requestId, status: "ACCEPTED" }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    {
      onSuccess: (_, variables) => {
        if (variables.action === "request" && variables.targetId) {
          setSentRequestIds(prev => [...prev, variables.targetId!]);
          const targetUser = allUsers.find(u => u.id === variables.targetId);
          toast.success(`Sent friend request to ${targetUser?.username || "user"}!`);
        } else if (variables.action === "respond") {
          toast.success("Friend request confirmed! You are now friends.");
        }
        queryClient.invalidateQueries(["my_real_friends"]);
        queryClient.invalidateQueries(["my_pending_requests"]);
        queryClient.invalidateQueries(["all_webpage_users"]);
      },
      onError: () => {
        toast.error("Could not complete action");
      }
    }
  );

  const friendIds = new Set(friends.map(f => f.id));
  const pendingSenderMap = new Map(pendingRequests.map(r => [r.user?.id, r.requestId]));
  const otherUsers = allUsers.filter(u => u.id !== user?.id);
  const filteredUsers = otherUsers.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-xl rounded-3xl border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground">Discover & Add Friends</h2>
              <p className="text-xs text-muted-foreground font-semibold">Connect with all members who created an ID on this platform</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b bg-background">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-muted/50 border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loadingUsers ? (
            <div className="text-center py-12 text-muted-foreground text-xs font-semibold">
              Loading community members...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Users className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
              <p className="text-sm font-bold text-foreground">No users found</p>
              <p className="text-xs text-muted-foreground">Try searching for a different username.</p>
            </div>
          ) : (
            filteredUsers.map(u => {
              const isFriend = friendIds.has(u.id);
              const incomingRequestId = pendingSenderMap.get(u.id);
              const isSent = sentRequestIds.includes(u.id);

              return (
                <div key={u.id} className="flex items-center justify-between p-3.5 rounded-2xl border bg-card hover:bg-muted/30 transition-all shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar src={u.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} alt={u.username} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-foreground truncate">{u.username}</span>
                        {isFriend && (
                          <span className="bg-green-500/10 text-green-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            Friend
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{u.bio || "Active Platform Member • " + (u.karma || 100) + " Karma"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-3">
                    {isFriend ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onClose();
                          window.dispatchEvent(new CustomEvent("open-chat-with", { detail: { targetUserId: u.id } }));
                        }}
                        className="rounded-xl font-bold text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border-none px-3"
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Chat
                      </Button>
                    ) : incomingRequestId ? (
                      <Button
                        size="sm"
                        onClick={() => relMutation.mutate({ action: "respond", requestId: incomingRequestId })}
                        disabled={relMutation.isLoading}
                        className="rounded-xl font-bold text-xs bg-green-600 hover:bg-green-700 text-white shadow-xs px-3"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Confirm Friend
                      </Button>
                    ) : isSent ? (
                      <Button
                        size="sm"
                        disabled
                        className="rounded-xl font-bold text-xs bg-muted text-muted-foreground px-3"
                      >
                        <Clock className="h-3.5 w-3.5 mr-1" /> Request Sent
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => relMutation.mutate({ action: "request", targetId: u.id })}
                        disabled={relMutation.isLoading}
                        className="rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs px-3"
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add Friend
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground font-semibold">
          <span>{filteredUsers.length} total members registered</span>
          <Button size="sm" variant="outline" onClick={onClose} className="rounded-xl font-bold text-xs">
            Close
          </Button>
        </div>

      </div>
    </div>
  );
}
