"use client";

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { MessageSquare, Send, Mic, Phone, Video, Info, Search, Circle, Smile, Image as ImageIcon, CheckCheck, FileText, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import { MessengerMessageItem, Message } from "@/components/MessengerMessageItem";

type Conversation = {
  id: string;
  updatedAt: string;
  participants: {
    id: string;
    username: string;
    image?: string;
  }[];
  lastMessage?: {
    id: string;
    senderId: string;
    content: string;
    createdAt: string;
  };
};

export default function FullMessengerPage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string; type: string; size: number } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["messenger_conversations"],
    queryFn: async () => {
      const res = await axios.get<Conversation[]>("/api/messages", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      return res.data;
    },
    refetchInterval: 3000,
    onSuccess: (data) => {
      if (!activeConvId && data && data.length > 0) {
        setActiveConvId(data[0].id);
      }
    }
  });

  const activeConv = conversations.find(c => c.id === activeConvId) || conversations[0];
  const otherParticipant = activeConv?.participants.find(p => p.id !== user?.id) || activeConv?.participants[0];

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

  const sendMutation = useMutation(
    async (payload: { text?: string; voiceNoteUrl?: string; fileUrl?: string; fileName?: string; fileType?: string; fileSize?: number; mediaUrl?: string }) => {
      if (!token || !activeConvId) throw new Error("Unauthorized");
      const res = await axios.post("/api/messages", {
        action: "send_message",
        conversationId: activeConvId,
        content: payload.text,
        voiceNoteUrl: payload.voiceNoteUrl,
        fileUrl: payload.fileUrl,
        fileName: payload.fileName,
        fileType: payload.fileType,
        fileSize: payload.fileSize,
        mediaUrl: payload.mediaUrl
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    {
      onSuccess: () => {
        setContent("");
        setPendingFile(null);
        queryClient.invalidateQueries(["messenger_msgs", activeConv?.id]);
        queryClient.invalidateQueries(["messenger_conversations"]);
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
        }, 3000);
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
    if (!content.trim() && !pendingFile) return;
    sendMutation.mutate({
      text: content.trim(),
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
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            const base64AudioMessage = reader.result as string;
            const durationStr = `${Math.floor(recordingTime / 60)}:${Math.floor(recordingTime % 60) < 10 ? "0" : ""}${Math.floor(recordingTime % 60)}`;
            sendMutation.mutate({
              voiceNoteUrl: base64AudioMessage,
              text: `🎙️ Voice Note (${durationStr || "0:05"})`,
              fileType: blob.type || "audio/webm",
              fileSize: blob.size,
              fileName: `VoiceNote-${Date.now()}.webm`
            });
            toast.success("Voice note sent!");
          };
          stream.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
        setRecordingTime(0);
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
        toast("Recording voice note...", { icon: "🎙️" });
      } catch (err) {
        console.error("Microphone error:", err);
        toast.error("Microphone permission required for voice notes");
      }
    }
  };

  const filteredConvs = conversations.filter(c => {
    const p = c.participants.find(part => part.id !== user?.id) || c.participants[0];
    return p?.username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background flex flex-col md:flex-row border-t">
      
      {/* Left Sidebar: Conversations List */}
      <aside className="w-full md:w-80 lg:w-96 border-r bg-card flex flex-col h-[400px] md:h-[calc(100vh-4rem)]">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-gradient flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" /> Messenger
            </h2>
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Connected to chat server" />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-xl bg-muted text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 border w-full"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Loading chats...</div>
          ) : filteredConvs.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">No conversations found.</div>
          ) : (
            filteredConvs.map(conv => {
              const p = conv.participants.find(part => part.id !== user?.id) || conv.participants[0];
              const lastMsg = conv.lastMessage;
              const isActive = conv.id === activeConvId;
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                    isActive ? "bg-primary/10 border-r-4 border-primary font-bold" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="relative">
                    <Avatar src={p?.image} alt={p?.username || "user"} size="md" />
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-card" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-1">
                      <p className="font-extrabold text-sm text-foreground truncate">{p?.username || "Member"}</p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "New"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate font-normal mt-0.5">
                      {lastMsg ? (lastMsg.senderId === user?.id ? "You: " : "") + lastMsg.content : "Start a discussion"}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Right Area: Active Conversation Window */}
      <main className="flex-1 flex flex-col bg-muted/10 h-[550px] md:h-[calc(100vh-4rem)]">
        {activeConv ? (
          <>
            {/* Chat Window Header */}
            <header className="p-4 bg-card border-b flex items-center justify-between shadow-xs z-10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar src={otherParticipant?.image} alt={otherParticipant?.username || "user"} size="md" />
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-card" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-foreground flex items-center gap-1.5">
                    <span>{otherParticipant?.username || "Chat Partner"}</span>
                    <span className="text-[10px] bg-green-500/10 text-green-600 font-extrabold px-2 py-0.5 rounded-full">Online</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">Active in Messenger • End-to-end simulated chat</p>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-2">
                <Button variant="ghost" size="sm" onClick={() => toast("Starting voice call simulation...", { icon: "📞" })} className="rounded-xl h-9 w-9 p-0 text-blue-600 hover:bg-blue-500/10" title="Voice Call">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toast("Starting video call simulation...", { icon: "📹" })} className="rounded-xl h-9 w-9 p-0 text-purple-600 hover:bg-purple-500/10" title="Video Call">
                  <Video className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toast("Viewing conversation info and shared media")} className="rounded-xl h-9 w-9 p-0 text-muted-foreground hover:bg-muted" title="Info">
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </header>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="text-center my-4">
                <span className="text-[11px] font-bold bg-muted text-muted-foreground px-3 py-1 rounded-full border">
                  Today • Encrypted Conversation
                </span>
              </div>

              {messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <MessengerMessageItem
                    key={msg.id}
                    msg={msg}
                    isMe={isMe}
                    otherParticipant={otherParticipant}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onEdit={(id, content) => editMutation.mutate({ messageId: id, content })}
                  />
                );
              })}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold animate-in fade-in-50 pl-2">
                  <Avatar src={otherParticipant?.image} alt="typing" size="sm" />
                  <div className="bg-card border p-2.5 rounded-2xl rounded-bl-none shadow-xs flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span>{otherParticipant?.username} is typing a reply...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Hidden File Inputs */}
            <input type="file" ref={photoInputRef} onChange={handleFileSelect} accept="image/*,.heic,.heif,.webp,.svg,.tiff,.bmp,.png,.jpg,.jpeg,.gif" className="hidden" />
            <input type="file" ref={docInputRef} onChange={handleFileSelect} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,*/*" className="hidden" />

            {/* Pending File Attachment Banner */}
            {pendingFile && (
              <div className="px-6 py-2 bg-muted/80 border-t flex items-center justify-between text-xs animate-in fade-in-50">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-extrabold text-blue-600">{pendingFile.type.startsWith("image/") ? "🖼️ Photo" : "📄 Doc"}:</span>
                  <span className="truncate text-foreground font-semibold">{pendingFile.name}</span>
                  <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded font-black whitespace-nowrap">100% HD Original</span>
                </div>
                <button type="button" onClick={() => setPendingFile(null)} className="p-1 hover:text-red-500 shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Input Footer */}
            <footer className="p-3.5 bg-card border-t shadow-sm">
              <form onSubmit={handleSend} className="flex items-center gap-2 max-w-5xl mx-auto">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-muted rounded-full transition-colors"
                  title="Send HD Photo / Image"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-muted rounded-full transition-colors"
                  title="Send PDF / DOCX / Document"
                >
                  <FileText className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleVoiceRecord}
                  className={`p-2 rounded-full transition-colors ${
                    isRecording ? "bg-red-500 text-white animate-pulse" : "text-muted-foreground hover:bg-muted hover:text-blue-600"
                  }`}
                  title="Record Voice Note"
                >
                  <Mic className="h-5 w-5" />
                </button>
                
                <input
                  type="text"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  disabled={isRecording}
                  placeholder={isRecording ? `Recording voice note (${recordingTime}s)... Click mic again to stop & send` : `Message ${otherParticipant?.username || "friend"}...`}
                  className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 border min-w-0"
                />

                <Button
                  type="submit"
                  disabled={(!content.trim() && !pendingFile) && !isRecording}
                  className="rounded-full h-10 w-10 p-0 bg-blue-600 hover:bg-blue-700 text-white shadow-md shrink-0 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <MessageSquare className="h-16 w-16 text-muted-foreground opacity-30" />
            <h3 className="font-extrabold text-lg">Your Messenger Conversations</h3>
            <p className="text-xs text-muted-foreground max-w-sm">Select a contact from the left sidebar to start end-to-end messaging, voice notes, and live collaboration.</p>
          </div>
        )}
      </main>

    </div>
  );
}
