"use client";

import { useState } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "react-query";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, UserPlus, Heart, MessageSquare, Share2, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

type Notification = {
  id: string;
  userId: string;
  actorId?: string;
  type: string;
  content: string;
  link: string;
  isRead: boolean;
  createdAt: string;
  actor?: {
    id: string;
    username: string;
    image?: string;
  };
};

export function NotificationDropdown() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data = { notifications: [], unreadCount: 0 }, refetch } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user || !token) return { notifications: [], unreadCount: 0 };
      const res = await axios.get<{ notifications: Notification[]; unreadCount: number }>("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    enabled: Boolean(user && token),
    refetchInterval: 15000,
  });

  const markReadMutation = useMutation(
    async (id?: string) => {
      if (!token) throw new Error("Unauthorized");
      await axios.patch("/api/notifications", { id, markAll: !id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["notifications", user?.id]);
      }
    }
  );

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }
    setIsOpen(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "FRIEND_REQUEST": return <UserPlus className="h-4 w-4 text-blue-500" />;
      case "REACTION": return <Heart className="h-4 w-4 text-red-500" />;
      case "COMMENT": return <MessageSquare className="h-4 w-4 text-green-500" />;
      case "FOLLOW": return <UserPlus className="h-4 w-4 text-purple-500" />;
      default: return <Bell className="h-4 w-4 text-orange-500" />;
    }
  };

  if (!user) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all duration-200 hover:bg-muted/80 hover:text-foreground focus:outline-none"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {data.unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow-sm animate-pulse">
              {data.unreadCount > 9 ? "9+" : data.unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-2 rounded-xl border bg-card shadow-2xl">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <h3 className="font-bold text-lg">Notifications</h3>
          {data.unreadCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                markReadMutation.mutate(undefined);
                toast.success("All marked as read");
              }}
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto divide-y divide-border/40 py-1">
          {data.notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No new notifications right now.
            </div>
          ) : (
            data.notifications.map((notif) => (
              <Link
                key={notif.id}
                href={notif.link}
                onClick={() => handleNotificationClick(notif)}
                className={`flex items-start gap-3 p-3 transition-colors hover:bg-muted/60 ${
                  !notif.isRead ? "bg-primary/5 font-medium" : ""
                }`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar
                    src={notif.actor?.image || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"}
                    alt={notif.actor?.username || "User"}
                    size="sm"
                  />
                  <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5 shadow">
                    {getIcon(notif.type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">
                    <span className="font-bold text-foreground">
                      {notif.actor?.username || "Someone"}
                    </span>{" "}
                    <span className="text-muted-foreground">{notif.content}</span>
                  </p>
                  <span className="text-xs text-muted-foreground/75 mt-1 block">
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                  </span>
                </div>
                {!notif.isRead && (
                  <span className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 self-center" />
                )}
              </Link>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
