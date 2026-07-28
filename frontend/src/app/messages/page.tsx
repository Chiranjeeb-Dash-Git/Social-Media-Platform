"use client";

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { MessageSquare, Send, Mic, Phone, Video, Info, Search, Circle, Smile, Image as ImageIcon, CheckCheck, FileText, X, Trash2, Users, UserPlus, UserMinus, ShieldAlert, Edit3, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import { MessengerMessageItem, Message } from "@/components/MessengerMessageItem";

type Conversation = {
  id: string;
  isGroup?: boolean;
  name?: string;
  adminId?: string;
  updatedAt?: string;
  createdAt?: string;
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
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [newChatType, setNewChatType] = useState<"DIRECT" | "GROUP">("DIRECT");
  const [groupNameInput, setGroupNameInput] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);
  const recordingStartRef = useRef<number>(0);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["all_registered_users"],
    queryFn: async () => {
      const res = await axios.get<any[]>("/api/users");
      return res.data;
    },
    enabled: showNewChatModal || showGroupInfoModal
  });

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["messenger_conversations"],
    queryFn: async () => {
      if (!token) return [];
      const res = await axios.get<Conversation[]>("/api/messages", { headers: { Authorization: `Bearer ${token}` } });
      return res.data;
    },
    enabled: Boolean(token),
    refetchInterval: 10000
  });

  const activeConv = conversations.find(c => c.id === activeConvId);
  const otherParticipant = activeConv?.participants.find(p => p.id !== user?.id) || activeConv?.participants[0];

  const { data: messages = [], refetch: refetchMsgs } = useQuery({
    queryKey: ["messenger_msgs", activeConvId],
    queryFn: async () => {
      if (!token || !activeConvId) return [];
      const res = await axios.get<Message[]>(`/api/messages?conversationId=${activeConvId}`, { headers: { Authorization: `Bearer ${token}` } });
      return res.data;
    },
    enabled: Boolean(token && activeConvId),
    refetchInterval: 3000
  });

  useEffect(() => {
    if (!activeConvId && conversations.length > 0) {
      setActiveConvId(conversations[0].id);
    }
  }, [activeConvId, conversations]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("newGroup=true")) {
      setNewChatType("GROUP");
      setSelectedUserIds([]);
      setGroupNameInput("");
      setShowNewChatModal(true);
    }
  }, []);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation(
    async (payload: { text?: string; content?: string; voiceNoteUrl?: string; fileUrl?: string; fileName?: string; fileType?: string; fileSize?: number; mediaUrl?: string }) => {
      if (!token || !activeConvId) throw new Error("Unauthorized");
      const res = await axios.post("/api/messages", {
        action: "send_message",
        conversationId: activeConvId,
        content: payload.text || payload.content,
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

  const createChatMutation = useMutation(
    async (data: { isGroup: boolean; name?: string; participantIds: string[] }) => {
      const res = await axios.post("/api/messages", {
        action: "create_conversation",
        isGroup: data.isGroup,
        name: data.name,
        participantIds: data.participantIds
      }, { headers: { Authorization: `Bearer ${token}` } });
      return res.data;
    },
    {
      onSuccess: (newConv) => {
        queryClient.invalidateQueries(["messenger_conversations"]);
        setActiveConvId(newConv.id);
        setShowNewChatModal(false);
        setSelectedUserIds([]);
        setGroupNameInput("");
        toast.success(newConv.isGroup ? "Group created successfully!" : "Chat started!");
      },
      onError: (err: any) => { toast.error(err.response?.data?.error || "Failed to create chat"); }
    }
  );

  const updateGroupMutation = useMutation(
    async (data: { name?: string; addParticipantIds?: string[]; removeParticipantId?: string }) => {
      if (!activeConvId) return;
      const res = await axios.post("/api/messages", {
        action: "update_group",
        conversationId: activeConvId,
        name: data.name,
        addParticipantIds: data.addParticipantIds,
        removeParticipantId: data.removeParticipantId
      }, { headers: { Authorization: `Bearer ${token}` } });
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["messenger_conversations"]);
        toast.success("Group updated!");
      },
      onError: (err: any) => { toast.error(err.response?.data?.error || "Failed to update group"); }
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
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true
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

        const options = mimeType ? { mimeType } : undefined;
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
              text: `🎙️ Voice Note (${durationStr})`,
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
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Connected to chat server" />
              <button
                type="button"
                onClick={() => {
                  setNewChatType("GROUP");
                  setSelectedUserIds([]);
                  setGroupNameInput("");
                  setShowNewChatModal(true);
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all transform hover:scale-[1.02]"
              >
                + Create Group Chat (with User IDs)
              </button>
            </div>
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
              const isGroup = conv.isGroup;
              const title = isGroup ? (conv.name || "Group Chat") : (p?.username || "Member");
              const avatarUrl = isGroup
                ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(title)}&backgroundColor=4f46e5`
                : p?.image;

              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                    isActive ? "bg-primary/10 border-r-4 border-primary font-bold" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar src={avatarUrl} alt={title} size="md" />
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-card" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <p className="font-extrabold text-sm text-foreground truncate">{title}</p>
                        {isGroup && (
                          <span className="bg-blue-500/10 text-blue-600 text-[9px] font-black px-1.5 py-0.2 rounded shrink-0">
                            GRP
                          </span>
                        )}
                      </div>
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
                  <Avatar
                    src={
                      activeConv.isGroup
                        ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(activeConv.name || "Group")}&backgroundColor=4f46e5`
                        : otherParticipant?.image
                    }
                    alt={activeConv.isGroup ? activeConv.name || "Group" : otherParticipant?.username || "user"}
                    size="md"
                  />
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-card" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-foreground flex items-center gap-1.5">
                    <span>{activeConv.isGroup ? activeConv.name || "Group Chat" : otherParticipant?.username || "Chat Partner"}</span>
                    {activeConv.isGroup ? (
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-600 font-extrabold px-2 py-0.5 rounded-full">
                        {activeConv.participants.length} Members
                      </span>
                    ) : (
                      <span className="text-[10px] bg-green-500/10 text-green-600 font-extrabold px-2 py-0.5 rounded-full">Online</span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {activeConv.isGroup
                      ? `Group Chat • ${activeConv.adminId === user?.id ? "You are Admin (manage members & posts)" : "Real-time sync"}`
                      : "Active in Messenger • End-to-end simulated chat"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-2">
                <Button variant="ghost" size="sm" onClick={() => toast("Starting voice call simulation...", { icon: "📞" })} className="rounded-xl h-9 w-9 p-0 text-blue-600 hover:bg-blue-500/10" title="Voice Call">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toast("Starting video call simulation...", { icon: "📹" })} className="rounded-xl h-9 w-9 p-0 text-purple-600 hover:bg-purple-500/10" title="Video Call">
                  <Video className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (activeConv.isGroup) {
                      setShowGroupInfoModal(true);
                    } else {
                      toast("Viewing conversation info and shared media");
                    }
                  }}
                  className="rounded-xl h-9 w-9 p-0 text-muted-foreground hover:bg-muted"
                  title={activeConv.isGroup ? "Group Settings & Members" : "Info"}
                >
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
                    isAdmin={activeConv.adminId === user?.id}
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

        {/* New Chat / Group Creation Modal */}
        {showNewChatModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in-50">
            <div className="bg-card border rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-4 bg-primary text-primary-foreground flex items-center justify-between">
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <Users className="h-5 w-5" /> Start Chat or Create Group
                </h3>
                <button onClick={() => setShowNewChatModal(false)} className="p-1 hover:bg-primary-foreground/20 rounded-full">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 border-b flex gap-2 bg-muted/30">
                <button
                  type="button"
                  onClick={() => setNewChatType("DIRECT")}
                  className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all ${
                    newChatType === "DIRECT" ? "bg-blue-600 text-white shadow-sm" : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  }`}
                >
                  Direct Message
                </button>
                <button
                  type="button"
                  onClick={() => setNewChatType("GROUP")}
                  className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    newChatType === "GROUP" ? "bg-blue-600 text-white shadow-sm" : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" /> Create Group
                </button>
              </div>

              <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                {newChatType === "GROUP" && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Group Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Real Web Developers, Squad Chat..."
                      value={groupNameInput}
                      onChange={e => setGroupNameInput(e.target.value)}
                      className="w-full bg-muted border rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">
                    {newChatType === "GROUP" ? "Select Members to Add" : "Select User to Message"}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search registered users..."
                      value={userSearchQuery}
                      onChange={e => setUserSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-muted border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="divide-y border rounded-2xl overflow-hidden bg-card">
                  {isLoadingUsers ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">Loading registered users...</div>
                  ) : (
                    allUsers
                      .filter((u: any) => u.id !== user?.id && u.username?.toLowerCase().includes(userSearchQuery.toLowerCase()))
                      .map((u: any) => {
                        const isSelected = selectedUserIds.includes(u.id);
                        return (
                          <div
                            key={u.id}
                            onClick={() => {
                              if (newChatType === "DIRECT") {
                                createChatMutation.mutate({ isGroup: false, participantIds: [u.id] });
                              } else {
                                if (isSelected) {
                                  setSelectedUserIds(prev => prev.filter(id => id !== u.id));
                                } else {
                                  setSelectedUserIds(prev => [...prev, u.id]);
                                }
                              }
                            }}
                            className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                              isSelected ? "bg-blue-50 dark:bg-blue-950/40" : "hover:bg-muted/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar src={u.image} alt={u.username} size="sm" />
                              <div>
                                <p className="font-bold text-sm text-foreground">{u.username}</p>
                                <p className="text-[10px] text-muted-foreground">Real registered user • Active ID</p>
                              </div>
                            </div>
                            {newChatType === "GROUP" && (
                              <div className={`h-5 w-5 rounded-md border flex items-center justify-center ${isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-muted-foreground/40"}`}>
                                {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {newChatType === "GROUP" && (
                <div className="p-4 border-t bg-muted/20 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowNewChatModal(false)} className="rounded-xl">
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={!groupNameInput.trim() || selectedUserIds.length === 0 || createChatMutation.isLoading}
                    onClick={() => createChatMutation.mutate({ isGroup: true, name: groupNameInput.trim(), participantIds: selectedUserIds })}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md"
                  >
                    Create Group ({selectedUserIds.length})
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Group Settings / Info Modal */}
        {showGroupInfoModal && activeConv && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in-50">
            <div className="bg-card border rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base flex items-center gap-2">
                    <Users className="h-5 w-5" /> {activeConv.name || "Group Settings"}
                  </h3>
                  <p className="text-[10px] opacity-80">
                    {activeConv.adminId === user?.id ? "You are the Admin of this group" : "Member View"}
                  </p>
                </div>
                <button onClick={() => setShowGroupInfoModal(false)} className="p-1 hover:bg-white/20 rounded-full">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 space-y-5 flex-1 overflow-y-auto">
                {/* Admin Rename Group */}
                {activeConv.adminId === user?.id && (
                  <div className="space-y-2 p-3 bg-muted/40 rounded-2xl border">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                      <Edit3 className="h-3 w-3" /> Rename Group
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        defaultValue={activeConv.name}
                        placeholder="Enter new group name..."
                        id="renameGroupInput"
                        className="flex-1 bg-background border rounded-xl px-3 py-1.5 text-xs font-semibold"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const input = document.getElementById("renameGroupInput") as HTMLInputElement;
                          if (input && input.value.trim()) {
                            updateGroupMutation.mutate({ name: input.value.trim() });
                          }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                )}

                {/* Add Member Section for Admin */}
                {activeConv.adminId === user?.id && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                      <UserPlus className="h-3 w-3 text-green-600" /> Add Member from Registered Users
                    </label>
                    <div className="max-h-36 overflow-y-auto border rounded-xl divide-y bg-card">
                      {allUsers
                        .filter((u: any) => !activeConv.participants.some(p => p.id === u.id))
                        .map((u: any) => (
                          <div key={u.id} className="p-2.5 flex items-center justify-between hover:bg-muted/50">
                            <div className="flex items-center gap-2">
                              <Avatar src={u.image} alt={u.username} size="sm" />
                              <span className="font-bold text-xs">{u.username}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateGroupMutation.mutate({ addParticipantIds: [u.id] })}
                              className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-extrabold px-2 py-1 rounded-lg flex items-center gap-1 transition-all"
                            >
                              + Add
                            </button>
                          </div>
                        ))}
                      {allUsers.filter((u: any) => !activeConv.participants.some(p => p.id === u.id)).length === 0 && (
                        <div className="p-4 text-center text-xs text-muted-foreground">All registered users are already in this group!</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Current Members List */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center justify-between">
                    <span>Group Members ({activeConv.participants.length})</span>
                    <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded">Admin has full moderation power</span>
                  </label>
                  <div className="border rounded-2xl divide-y overflow-hidden bg-card">
                    {activeConv.participants.map(p => {
                      const isAdmin = p.id === activeConv.adminId;
                      const isMe = p.id === user?.id;
                      return (
                        <div key={p.id} className="p-3 flex items-center justify-between hover:bg-muted/30">
                          <div className="flex items-center gap-3">
                            <Avatar src={p.image} alt={p.username} size="sm" />
                            <div>
                              <p className="font-extrabold text-sm flex items-center gap-1.5">
                                <span>{p.username}</span>
                                {isMe && <span className="text-[10px] text-muted-foreground font-normal">(You)</span>}
                                {isAdmin && (
                                  <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                    <ShieldAlert className="h-2.5 w-2.5" /> ADMIN
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-muted-foreground">Active Member</p>
                            </div>
                          </div>
                          {activeConv.adminId === user?.id && !isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Remove ${p.username} from group?`)) {
                                  updateGroupMutation.mutate({ removeParticipantId: p.id });
                                }
                              }}
                              className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors font-bold text-xs flex items-center gap-1"
                              title="Remove member"
                            >
                              <UserMinus className="h-4 w-4" /> Remove
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-muted/20 border-t flex justify-end">
                <Button size="sm" onClick={() => setShowGroupInfoModal(false)} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
                  Done
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

    </div>
  );
}
