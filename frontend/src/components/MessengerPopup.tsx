"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, X, Send, Mic, Smile, Users, ChevronLeft, Phone, Video, MoreVertical } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

type Conversation = {
  id: string;
  isGroup: boolean;
  name?: string;
  createdAt: string;
  participants: { id: string; username: string; image?: string }[];
  lastMessage?: { id: string; content: string; senderId: string; createdAt: string };
};

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  mediaUrl?: string;
  voiceNoteUrl?: string;
  createdAt: string;
  sender?: { id: string; username: string; image?: string };
};

export function MessengerPopup() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [inputMsg, setInputMsg] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], refetch: refetchConvs } = useQuery({
    queryKey: ["messenger_convs", user?.id],
    queryFn: async () => {
      if (!user || !token) return [];
      const res = await axios.get<Conversation[]>("/api/messages", {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    enabled: Boolean(user && token && isOpen),
    refetchInterval: 10000,
  });

  const { data: messages = [], refetch: refetchMsgs } = useQuery({
    queryKey: ["messenger_msgs", activeConv?.id],
    queryFn: async () => {
      if (!user || !token || !activeConv) return [];
      const res = await axios.get<Message[]>(`/api/messages?conversationId=${activeConv.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    enabled: Boolean(user && token && activeConv),
    refetchInterval: 3000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (payload: { content?: string; voiceNoteUrl?: string }) => {
      if (!token || !activeConv || !user) return;
      const res = await axios.post("/api/messages", {
        action: "send_message",
        conversationId: activeConv.id,
        content: payload.content,
        voiceNoteUrl: payload.voiceNoteUrl
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    onSuccess: () => {
      setInputMsg("");
      queryClient.invalidateQueries(["messenger_msgs", activeConv?.id]);
      queryClient.invalidateQueries(["messenger_convs", user?.id]);
      // Simulate reply typing
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
      }, 2500);
    }
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    sendMutation.mutate({ content: inputMsg.trim() });
  };

  const handleVoiceRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      sendMutation.mutate({ voiceNoteUrl: "https://actions.google.com/sounds/v1/alarms/beep_short.ogg", content: "🎵 Voice Note (0:05)" });
      toast.success("Voice note sent");
    } else {
      setIsRecording(true);
      toast("Recording voice note...", { icon: "🎙️" });
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {isOpen ? (
        <div className="w-80 sm:w-96 h-[500px] bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-primary px-4 py-3 text-primary-foreground flex items-center justify-between shadow-md">
            {activeConv ? (
              <div className="flex items-center gap-2 min-w-0">
                <button onClick={() => setActiveConv(null)} className="p-1 hover:bg-primary-foreground/20 rounded-full">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <Avatar
                  src={activeConv.participants.find(p => p.id !== user.id)?.image || "https://api.dicebear.com/7.x/avataaars/svg?seed=chat"}
                  alt="Chat"
                  size="sm"
                />
                <div className="min-w-0">
                  <h4 className="font-bold text-sm truncate">
                    {activeConv.name || activeConv.participants.filter(p => p.id !== user.id).map(p => p.username).join(", ") || "Saved Notes"}
                  </h4>
                  <span className="text-[10px] opacity-80 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" /> Active now
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <h4 className="font-bold text-base">Messenger</h4>
              </div>
            )}
            <div className="flex items-center gap-1">
              {activeConv && (
                <>
                  <button onClick={() => toast.success("Calling...")} className="p-1.5 hover:bg-primary-foreground/20 rounded-full">
                    <Phone className="h-4 w-4" />
                  </button>
                  <button onClick={() => toast.success("Starting video call...")} className="p-1.5 hover:bg-primary-foreground/20 rounded-full">
                    <Video className="h-4 w-4" />
                  </button>
                </>
              )}
              <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-primary-foreground/20 rounded-full">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto bg-muted/20 p-3">
            {!activeConv ? (
              <div className="space-y-1">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">Recent Chats</div>
                {conversations.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    No active conversations.<br />Visit any profile or community to start messaging!
                  </div>
                ) : (
                  conversations.map(c => {
                    const other = c.participants.find(p => p.id !== user.id) || c.participants[0];
                    return (
                      <div
                        key={c.id}
                        onClick={() => setActiveConv(c)}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/80 cursor-pointer transition-all"
                      >
                        <Avatar src={other?.image || "https://api.dicebear.com/7.x/avataaars/svg?seed=chat"} alt={other?.username || "User"} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline">
                            <h5 className="font-bold text-sm truncate">{c.name || other?.username || "Chat"}</h5>
                            <span className="text-[10px] text-muted-foreground">
                              {c.lastMessage ? formatDistanceToNow(new Date(c.lastMessage.createdAt), { addSuffix: false }) : ""}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {c.lastMessage ? `${c.lastMessage.senderId === user.id ? "You: " : ""}${c.lastMessage.content}` : "No messages yet"}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    Start of conversation with {activeConv.participants.filter(p => p.id !== user.id).map(p => p.username).join(", ")}. Say hello! 👋
                  </div>
                ) : (
                  messages.map(m => {
                    const isMe = m.senderId === user.id;
                    return (
                      <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                          isMe ? "bg-primary text-primary-foreground rounded-br-xs" : "bg-muted text-foreground rounded-bl-xs shadow-xs"
                        }`}>
                          {m.voiceNoteUrl ? (
                            <div className="flex items-center gap-2">
                              <Mic className="h-4 w-4 animate-bounce" />
                              <span>{m.content}</span>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                          )}
                        </div>
                        <span className="text-[9px] text-muted-foreground mt-0.5 px-1">
                          {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    );
                  })
                )}
                {isTyping && (
                  <div className="flex items-center gap-1 bg-muted px-3 py-2 rounded-full w-fit animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce delay-100" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce delay-200" />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Footer / Input */}
          {activeConv && (
            <form onSubmit={handleSend} className="p-2 border-t bg-background flex items-center gap-2">
              <button
                type="button"
                onClick={handleVoiceRecord}
                className={`p-2 rounded-full transition-colors ${
                  isRecording ? "bg-red-500 text-white animate-pulse" : "text-muted-foreground hover:bg-muted"
                }`}
                title="Record Voice Note"
              >
                <Mic className="h-4 w-4" />
              </button>
              <input
                type="text"
                placeholder={isRecording ? "Recording voice note..." : "Aa"}
                value={inputMsg}
                onChange={e => setInputMsg(e.target.value)}
                disabled={isRecording}
                className="flex-1 h-9 rounded-full bg-muted px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={!inputMsg.trim() && !isRecording}
                className="p-2 bg-primary text-primary-foreground rounded-full disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 ring-4 ring-background"
          aria-label="Open Messenger"
        >
          <MessageCircle className="h-7 w-7" />
        </button>
      )}
    </div>
  );
}
