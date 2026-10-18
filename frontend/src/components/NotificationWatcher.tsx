"use client";

import { useEffect, useRef } from "react";
import axios from "axios";
import { useQuery } from "react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

type Notification = { id: string; type: string; content: string; isRead: boolean; actor?: { username?: string } };

function playNotificationSound() {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(740, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(980, context.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.23);
    window.setTimeout(() => void context.close(), 400);
  } catch {
    // Browsers can block audio until the user has interacted with the page.
  }
}

export function NotificationWatcher() {
  const { user, token } = useAuth();
  const seenIds = useRef<Set<string> | null>(null);

  const { data } = useQuery({
    queryKey: ["notification-watcher", user?.id],
    queryFn: async () => (await axios.get<{ notifications: Notification[] }>("/api/notifications", { headers: { Authorization: `Bearer ${token}` } })).data,
    enabled: Boolean(user && token),
    refetchInterval: 5000,
    staleTime: 0,
  });

  useEffect(() => {
    if (!data?.notifications) return;
    const unread = data.notifications.filter((item) => !item.isRead);
    if (!seenIds.current) {
      seenIds.current = new Set(unread.map((item) => item.id));
      return;
    }
    const fresh = unread.filter((item) => !seenIds.current?.has(item.id));
    unread.forEach((item) => seenIds.current?.add(item.id));
    if (!fresh.length) return;
    playNotificationSound();
    const first = fresh[0];
    toast(`${first.actor?.username || "Someone"} ${first.content}`, { icon: "🔔", duration: 5000 });
  }, [data]);

  return null;
}
