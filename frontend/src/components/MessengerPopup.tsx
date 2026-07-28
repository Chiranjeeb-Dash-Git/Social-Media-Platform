"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, X, Send, Mic, Smile, Users, ChevronLeft, Phone, Video, MoreVertical, Image as ImageIcon, FileText, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import { MessengerMessageItem, Message } from "@/components/MessengerMessageItem";

type Conversation = {
  id: string;
  isGroup: boolean;
  name?: string;
  adminId?: string;
  createdAt: string;
  participants: { id: string; username: string; image?: string }[];
  lastMessage?: { id: string; content: string; senderId: string; createdAt: string };
};

export function MessengerPopup() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [inputMsg, setInputMsg] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string; type: string; size: number } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);
  const recordingStartRef = useRef<number>(0);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    const handleOpenChat = async (e: any) => {
      const { targetUserId } = e.detail || {};
      setIsOpen(true);
      if (!targetUserId || !user || !token) return;
      const existing = conversations.find(c => !c.isGroup && c.participants.some(p => p.id === targetUserId));
      if (existing) {
        setActiveConv(existing);
      } else {
        try {
          const res = await axios.post("/api/messages", {
            action: "create_conversation",
            isGroup: false,
            participantIds: [targetUserId]
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          queryClient.invalidateQueries(["messenger_convs", user.id]);
          setActiveConv(res.data);
        } catch (err) {
          console.error("Could not open chat conversation", err);
        }
      }
    };
    window.addEventListener("open-chat-with", handleOpenChat);
    return () => window.removeEventListener("open-chat-with", handleOpenChat);
  }, [conversations, user, token, queryClient]);

  const sendMutation = useMutation(
    async (payload: { content?: string; voiceNoteUrl?: string; fileUrl?: string; fileName?: string; fileType?: string; fileSize?: number; mediaUrl?: string }) => {
      if (!token || !activeConv || !user) throw new Error("Unauthorized");
      const res = await axios.post("/api/messages", {
        action: "send_message",
        conversationId: activeConv.id,
        content: payload.content,
        mediaUrl: payload.mediaUrl,
        voiceNoteUrl: payload.voiceNoteUrl,
        fileUrl: payload.fileUrl,
        fileName: payload.fileName,
        fileType: payload.fileType,
        fileSize: payload.fileSize
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    {
      onSuccess: () => {
        setInputMsg("");
        setPendingFile(null);
        queryClient.invalidateQueries(["messenger_msgs", activeConv?.id]);
        queryClient.invalidateQueries(["messenger_convs"]);
      },
      onError: () => {
        toast.error("Failed to send message");
      }
    }
  );

  const deleteMutation = useMutation(
    async (messageId: string) => {
      if (!token) throw new Error("Unauthorized");
      const res = await axios.post("/api/messages", { action: "delete_message", messageId }, { headers: { Authorization: `Bearer ${token}` } });
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["messenger_msgs", activeConv?.id]);
        toast.success("Message unsent");
      }
    }
  );

  const editMutation = useMutation(
    async ({ messageId, content }: { messageId: string; content: string }) => {
      if (!token) throw new Error("Unauthorized");
      const res = await axios.post("/api/messages", { action: "edit_message", messageId, content }, { headers: { Authorization: `Bearer ${token}` } });
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["messenger_msgs", activeConv?.id]);
        toast.success("Message edited");
      }
    }
  );

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() && !pendingFile) return;
    sendMutation.mutate({
      content: inputMsg.trim(),
      fileUrl: pendingFile?.url,
      fileName: pendingFile?.name,
      fileType: pendingFile?.type,
      fileSize: pendingFile?.size,
      mediaUrl: pendingFile?.type.startsWith("image/") ? pendingFile.url : undefined
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setPendingFile({
        url: reader.result as string,
        name: file.name,
        type: file.type || (file.name.endsWith(".pdf") ? "application/pdf" : file.name.endsWith(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/octet-stream"),
        size: file.size
      });
      toast.success(`Attached ${file.name} (100% Original Clarity)`);
    };
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1
          }
        });

        let mimeType = "audio/webm;codecs=opus";
        if (typeof MediaRecorder.isTypeSupported === "function") {
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            if (MediaRecorder.isTypeSupported("audio/webm")) mimeType = "audio/webm";
            else if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";
            else mimeType = "";
          }
        } else {
          mimeType = "";
        }

        const options = mimeType ? { mimeType, audioBitsPerSecond: 128000 } : undefined;
        const recorder = new MediaRecorder(stream, options);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recordingStartRef.current = Date.now();

        recorder.onstop = () => {
          const elapsedSec = Math.max(1, Math.round((Date.now() - recordingStartRef.current) / 1000));
          const durationStr = `${Math.floor(elapsedSec / 60)}:${Math.floor(elapsedSec % 60) < 10 ? "0" : ""}${Math.floor(elapsedSec % 60)}`;
          const blobType = mimeType || recorder.mimeType || "audio/webm";
          const blob = new Blob(chunks, { type: blobType });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            const base64AudioMessage = reader.result as string;
            sendMutation.mutate({
              voiceNoteUrl: base64AudioMessage,
              content: `🎙️ Voice Note (${durationStr})`,
              fileType: blobType,
              fileSize: blob.size,
              fileName: `VoiceNote-${Date.now()}.webm`
            });
            toast.success("Voice note sent loud & clear!");
          };
          stream.getTracks().forEach(track => track.stop());
        };

        recorder.start(250);
        setMediaRecorder(recorder);
        setIsRecording(true);
        setRecordingTime(0);
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
        toast("Recording voice note... Speak now!", { icon: "🎙️" });
      } catch (err) {
        console.error("Microphone error:", err);
        toast.error("Microphone permission required for voice notes");
      }
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
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  <h4 className="font-bold text-base">Messenger</h4>
                </div>
                <a href="/messages" className="text-[11px] font-extrabold bg-primary-foreground/20 hover:bg-primary-foreground/30 text-white px-2 py-0.5 rounded-full transition-colors">
                  + New Group / Chat
                </a>
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
                <X className="h-5 w-5" />
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
                      <MessengerMessageItem
                        key={m.id}
                        msg={m}
                        isMe={isMe}
                        otherParticipant={activeConv.participants.find(p => p.id !== user.id)}
                        isAdmin={activeConv.adminId === user.id}
                        onDelete={(id) => deleteMutation.mutate(id)}
                        onEdit={(id, content) => editMutation.mutate({ messageId: id, content })}
                      />
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

          {/* Hidden File Inputs */}
          <input type="file" ref={photoInputRef} onChange={handleFileSelect} accept="image/*,.heic,.heif,.webp,.svg,.tiff,.bmp,.png,.jpg,.jpeg,.gif" className="hidden" />
          <input type="file" ref={docInputRef} onChange={handleFileSelect} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,*/*" className="hidden" />

          {/* Pending File Attachment Banner */}
          {pendingFile && (
            <div className="px-3 py-1.5 bg-muted/80 border-t flex items-center justify-between text-xs animate-in fade-in-50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-extrabold text-blue-600">{pendingFile.type.startsWith("image/") ? "🖼️ Photo" : "📄 Doc"}:</span>
                <span className="truncate text-foreground font-semibold">{pendingFile.name}</span>
                <span className="text-[10px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded font-black whitespace-nowrap">HD Original</span>
              </div>
              <button type="button" onClick={() => setPendingFile(null)} className="p-1 hover:text-red-500 shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Footer / Input */}
          {activeConv && (
            <form onSubmit={handleSend} className="p-2 border-t bg-background flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-muted rounded-full transition-colors"
                title="Send HD Photo / Image"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-muted rounded-full transition-colors"
                title="Send PDF / DOCX / Document"
              >
                <FileText className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleVoiceRecord}
                className={`p-1.5 rounded-full transition-colors ${
                  isRecording ? "bg-red-500 text-white animate-pulse" : "text-muted-foreground hover:bg-muted"
                }`}
                title="Record Voice Note"
              >
                <Mic className="h-4 w-4" />
              </button>
              <input
                type="text"
                placeholder={isRecording ? `Recording (${recordingTime}s)... Click mic to stop & send` : "Aa"}
                value={inputMsg}
                onChange={e => setInputMsg(e.target.value)}
                disabled={isRecording}
                className="flex-1 h-9 rounded-full bg-muted px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary min-w-0"
              />
              <button
                type="submit"
                disabled={(!inputMsg.trim() && !pendingFile) && !isRecording}
                className="p-2 bg-primary text-primary-foreground rounded-full disabled:opacity-50 hover:opacity-90 transition-opacity shrink-0"
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
