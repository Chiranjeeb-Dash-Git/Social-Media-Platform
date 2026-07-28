"use client";

import { useState, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { Mic, Play, Pause, Download, FileText, File, Check, CheckCheck, Trash2, Edit2, MoreVertical, X, ZoomIn, ExternalLink } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  mediaUrl?: string;
  voiceNoteUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  isDeleted?: boolean;
  isEdited?: boolean;
  editedAt?: string;
  createdAt: string;
  sender?: { id: string; username: string; image?: string };
};

function formatFileSize(bytes?: number) {
  if (!bytes) return "HD Original";
  if (bytes < 1024) return `${bytes} B • 100% Original Clarity`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB • 100% Original Clarity`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB • Ultra HD Original`;
}

function VoiceNotePlayer({ url, content }: { url: string; content?: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error("Audio playback error:", err);
        toast.error("Could not play audio note");
      });
    }
  };

  const toggleSpeed = () => {
    if (!audioRef.current) return;
    const nextSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    audioRef.current.playbackRate = nextSpeed;
    setSpeed(nextSpeed);
  };

  const formatTime = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec) || sec <= 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="flex items-center gap-2.5 bg-background/60 p-3 rounded-2xl border w-64 sm:w-72 shadow-xs">
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (d && isFinite(d) && !isNaN(d)) {
            setDuration(d);
          } else {
            // Workaround for WebM duration in browsers
            e.currentTarget.currentTime = 1e101;
            setTimeout(() => {
              if (audioRef.current && isFinite(audioRef.current.duration)) {
                setDuration(audioRef.current.duration);
                audioRef.current.currentTime = 0;
              }
            }, 100);
          }
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
      />
      <button
        type="button"
        onClick={togglePlay}
        className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md hover:scale-105 transition-all shrink-0"
        title={isPlaying ? "Pause voice note" : "Play voice note"}
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* Waveform simulation */}
        <div className="flex items-center gap-0.5 h-6 mb-1">
          {[4, 8, 14, 18, 10, 16, 20, 8, 14, 18, 10, 16, 12, 6, 14].map((h, idx) => {
            const progress = duration > 0 ? (currentTime / duration) : 0;
            const isPassed = (idx / 15) <= progress;
            return (
              <div
                key={idx}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  isPassed ? "bg-blue-600 shadow-xs scale-y-110" : "bg-muted-foreground/30"
                }`}
                style={{ height: `${Math.max(4, isPlaying && isPassed ? (h * 1.3) % 22 : h)}px` }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] font-bold text-foreground/80">
          <span>
            {currentTime > 0 ? `${formatTime(currentTime)} / ${formatTime(duration)}` : (duration > 0 && isFinite(duration) ? formatTime(duration) : content || "HD Voice Note")}
          </span>
          <button
            type="button"
            onClick={toggleSpeed}
            className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 px-1.5 py-0.5 rounded font-black text-[9px] transition-colors"
          >
            {speed}x
          </button>
        </div>
      </div>
      <a
        href={url}
        download="VoiceNote-HD.webm"
        className="p-1.5 text-muted-foreground hover:text-blue-600 transition-colors shrink-0 rounded-lg hover:bg-muted"
        title="Download HD Audio Note"
      >
        <Download className="h-4 w-4" />
      </a>
    </div>
  );
}

export function MessengerMessageItem({
  msg,
  isMe,
  otherParticipant,
  onDelete,
  onEdit
}: {
  msg: Message;
  isMe: boolean;
  otherParticipant?: { id: string; username: string; image?: string };
  onDelete?: (id: string) => void;
  onEdit?: (id: string, content: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);
  const [showMenu, setShowMenu] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContent.trim()) return;
    if (onEdit) {
      onEdit(msg.id, editContent.trim());
    }
    setIsEditing(false);
    setShowMenu(false);
  };

  const isImage = msg.fileType?.startsWith("image/") || (!msg.fileType && msg.mediaUrl && !msg.fileName?.endsWith(".pdf") && !msg.fileName?.endsWith(".docx") && !msg.fileName?.endsWith(".doc"));
  const isDoc = msg.fileUrl && !isImage;

  if (msg.isDeleted) {
    return (
      <div className={`flex items-end gap-2 my-1 ${isMe ? "justify-end" : "justify-start"}`}>
        {!isMe && <Avatar src={otherParticipant?.image} alt={otherParticipant?.username || "user"} size="sm" />}
        <div className="bg-muted/40 border border-dashed rounded-2xl px-3.5 py-2 text-xs italic text-muted-foreground flex items-center gap-2 shadow-xs">
          <span className="text-sm">🚫</span>
          <span>{isMe ? "You deleted this message" : "This message was deleted"}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`flex items-end gap-2.5 my-1.5 group relative ${isMe ? "justify-end" : "justify-start"}`}>
        {!isMe && <Avatar src={otherParticipant?.image} alt={otherParticipant?.username || "user"} size="sm" />}
        
        <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[85%] sm:max-w-md`}>
          {/* Main Bubble */}
          <div className={`relative p-3 rounded-2xl text-sm shadow-sm transition-all ${
            isMe
              ? "bg-blue-600 text-white rounded-br-none font-medium"
              : "bg-card text-foreground border rounded-bl-none font-normal"
          }`}>
            {/* Options Menu Button (only for sender) */}
            {isMe && !isEditing && (
              <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 rounded-full bg-card border shadow-xs text-muted-foreground hover:text-foreground"
                  title="Message options"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 bottom-full mb-1 w-40 bg-card border rounded-xl shadow-xl py-1 z-50 text-foreground text-xs font-semibold animate-in fade-in-50">
                    {!msg.voiceNoteUrl && !isDoc && !isImage && (
                      <button
                        type="button"
                        onClick={() => { setIsEditing(true); setShowMenu(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-blue-500" /> Edit message
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { if (onDelete) onDelete(msg.id); setShowMenu(false); }}
                      className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-600 flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Unsend (for everyone)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Editing Mode */}
            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="space-y-2 min-w-[220px]">
                <div className="flex items-center justify-between text-[10px] font-bold text-blue-100 bg-blue-700/50 px-2 py-1 rounded">
                  <span>✏️ Editing message</span>
                  <button type="button" onClick={() => setIsEditing(false)} className="hover:text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full bg-background text-foreground rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-white border resize-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex justify-end gap-1.5">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-7 text-xs text-blue-100 hover:bg-blue-700">
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="h-7 text-xs bg-white text-blue-700 hover:bg-blue-50 font-bold">
                    Save
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-2">
                {/* Voice Note */}
                {msg.voiceNoteUrl && (
                  <VoiceNotePlayer url={msg.voiceNoteUrl} content={msg.content} />
                )}

                {/* Photo / Image Attachment */}
                {isImage && (msg.fileUrl || msg.mediaUrl) && (
                  <div className="space-y-1.5">
                    <div
                      onClick={() => setShowLightbox(true)}
                      className="relative rounded-xl overflow-hidden cursor-pointer group/img border border-white/10 max-h-64 sm:max-h-80 bg-black/20"
                    >
                      <img
                        src={msg.fileUrl || msg.mediaUrl}
                        alt={msg.fileName || "HD Photo"}
                        className="w-full h-auto object-cover group-hover/img:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-md border border-white/20 uppercase tracking-wider flex items-center gap-1">
                        <span>✨ Ultra HD Original</span>
                      </div>
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-black/70 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                          <ZoomIn className="h-4 w-4" /> View HD
                        </span>
                      </div>
                    </div>
                    
                    <a
                      href={msg.fileUrl || msg.mediaUrl}
                      download={msg.fileName || "photo-ultra-hd.png"}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl font-bold text-xs transition-colors shadow-xs ${
                        isMe
                          ? "bg-blue-700 hover:bg-blue-800 text-white"
                          : "bg-muted hover:bg-muted/80 text-foreground"
                      }`}
                      title="Download with 100% Original Clarity (Zero Compression)"
                    >
                      <Download className="h-3.5 w-3.5" /> Download HD Original ({formatFileSize(msg.fileSize)})
                    </a>
                  </div>
                )}

                {/* Document / File Attachment */}
                {isDoc && (
                  <div className={`p-3 rounded-xl border flex flex-col gap-2 ${
                    isMe ? "bg-blue-700/60 border-blue-400/30 text-white" : "bg-muted/50 border-border text-foreground"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 font-black text-sm">
                        {msg.fileName?.endsWith(".pdf") ? "PDF" : msg.fileName?.endsWith(".docx") || msg.fileName?.endsWith(".doc") ? "DOC" : <FileText className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-xs truncate">{msg.fileName || "Attached Document"}</p>
                        <p className={`text-[10px] font-medium ${isMe ? "text-blue-100" : "text-muted-foreground"}`}>
                          {formatFileSize(msg.fileSize)} • Document
                        </p>
                      </div>
                    </div>
                    <a
                      href={msg.fileUrl}
                      download={msg.fileName || "document"}
                      className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-xs transition-colors shadow-xs ${
                        isMe ? "bg-white text-blue-700 hover:bg-blue-50" : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      <Download className="h-3.5 w-3.5" /> Download Original (100% Clarity)
                    </a>
                  </div>
                )}

                {/* Text Content (if not voice note) */}
                {!msg.voiceNoteUrl && msg.content && (
                  <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>
                )}
              </div>
            )}

            {/* Timestamp & Status */}
            <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMe ? "text-blue-100" : "text-muted-foreground"}`}>
              {msg.isEdited && <span className="italic opacity-80">(edited)</span>}
              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              {isMe && <CheckCheck className="h-3 w-3 text-blue-200" />}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen HD Lightbox */}
      {showLightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
          <button
            type="button"
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="max-w-5xl max-h-[80vh] overflow-hidden rounded-2xl shadow-2xl border border-white/20">
            <img src={msg.fileUrl || msg.mediaUrl} alt="HD Fullscreen" className="w-full h-full object-contain" />
          </div>
          
          <div className="mt-4 flex items-center gap-4 bg-card/90 backdrop-blur-md px-6 py-3 rounded-2xl border shadow-xl">
            <div className="text-left">
              <p className="font-extrabold text-sm text-foreground">{msg.fileName || "HD Photo Attachment"}</p>
              <p className="text-xs text-muted-foreground">100% Original Resolution • Zero Compression Harm</p>
            </div>
            <a
              href={msg.fileUrl || msg.mediaUrl}
              download={msg.fileName || "photo-ultra-hd.png"}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-2 rounded-xl flex items-center gap-2 text-xs shadow-md transition-all"
            >
              <Download className="h-4 w-4" /> Download Ultra HD
            </a>
          </div>
        </div>
      )}
    </>
  );
}
