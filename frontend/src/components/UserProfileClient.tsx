"use client";

import { useState } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "react-query";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import {
  UserPlus, UserCheck, UserX, MessageSquare, Edit3, Camera, MapPin, Briefcase,
  GraduationCap, Calendar, Heart, ShieldAlert, MoreHorizontal, Grid, Film, Users, Check
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { useAuth } from "@/contexts/AuthContext";
import { PostCard, type Post } from "@/components/PostCard";
import { CreatePostDialog } from "@/components/CreatePostDialog";

interface UserProfileClientProps {
  username: string;
}

export function UserProfileClient({ username }: UserProfileClientProps) {
  const { user: currentUser, token } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"TIMELINE" | "ABOUT" | "FRIENDS" | "PHOTOS">("TIMELINE");
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Edit Profile form states
  const [bio, setBio] = useState("");
  const [employment, setEmployment] = useState("");
  const [education, setEducation] = useState("");
  const [location, setLocation] = useState("");
  const [coverPhotoUrl, setCoverPhotoUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["user_profile_detail", username],
    queryFn: async () => {
      const res = await axios.get<{ user: any; relationship: any }>(`/api/users/${username}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      return res.data;
    },
    onSuccess: (d) => {
      if (d?.user) {
        setBio(d.user.bio || "");
        setEmployment(d.user.employment || "");
        setEducation(d.user.education || "");
        setLocation(d.user.location || "");
        setCoverPhotoUrl(d.user.coverPhoto || "");
        setAvatarUrl(d.user.image || "");
      }
    }
  });

  const { data: userPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["user_posts", data?.user?.id],
    queryFn: async () => {
      if (!data?.user?.id) return [];
      const res = await axios.get<Post[]>("/api/posts");
      return res.data.filter(p => p.author?.id === data.user.id);
    },
    enabled: Boolean(data?.user?.id)
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!token) return;
      const res = await axios.patch("/api/users/profile", {
        bio,
        employment,
        education,
        location,
        coverPhoto: coverPhotoUrl || "https://images.unsplash.com/photo-1707343843467-98e24e52d329",
        image: avatarUrl || data?.user?.image
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    onSuccess: () => {
      setIsEditingProfile(false);
      refetch();
      queryClient.invalidateQueries(["user_profile_detail", username]);
      toast.success("Profile updated!");
    },
    onError: () => toast.error("Failed to update profile")
  });

  const relationshipMutation = useMutation({
    mutationFn: async (payload: { action: string; targetId?: string; requestId?: string; status?: string }) => {
      if (!token || !data?.user) return;
      const res = await axios.post("/api/users/relationships", {
        ...payload,
        targetId: data.user.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    onSuccess: () => {
      refetch();
      toast.success("Relationship updated");
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!data || !data.user) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-extrabold text-foreground">User not found</h2>
        <p className="text-sm text-muted-foreground mt-2">The profile u/{username} does not exist or was removed.</p>
        <Button asChild className="mt-6 rounded-xl"><Link href="/">Back to News Feed</Link></Button>
      </div>
    );
  }

  const profileUser = data.user;
  const rel = data.relationship || { friendStatus: "NONE", isFollowing: false, isBlocked: false, isSnoozed: false };
  const isSelf = currentUser?.id === profileUser.id;

  const handleImageFile = (file: File, setter: (val: string) => void) => {
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Choose an image smaller than 3 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setter(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-muted/15 pb-16">
      
      {/* Cover Photo Header */}
      <div className="bg-card border-b shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div
            className="relative h-48 sm:h-72 w-full bg-slate-800 bg-cover bg-center rounded-b-3xl overflow-hidden shadow-inner"
            style={{ backgroundImage: `url(${profileUser.coverPhoto || "https://images.unsplash.com/photo-1707343843467-98e24e52d329"})` }}
          >
            {isSelf && (
              <label className="absolute bottom-4 right-4 bg-black/70 hover:bg-black/90 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer backdrop-blur-md transition-all shadow-md">
                <Camera className="h-4 w-4" />
                <span>Edit Cover Photo</span>
                <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f, (val) => { setCoverPhotoUrl(val); updateProfileMutation.mutate(); }); }} />
              </label>
            )}
          </div>

          {/* Profile Details & Action Buttons Bar */}
          <div className="px-4 sm:px-8 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-12 relative z-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
              <div className="relative">
                <div className="h-32 w-32 sm:h-40 sm:w-40 rounded-full border-4 border-card bg-card overflow-hidden shadow-2xl flex-shrink-0">
                  <Avatar src={profileUser.image} alt={profileUser.username} className="h-full w-full object-cover" />
                </div>
                {isSelf && (
                  <label className="absolute bottom-1 right-1 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform">
                    <Camera className="h-4 w-4" />
                    <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f, (val) => { setAvatarUrl(val); updateProfileMutation.mutate(); }); }} />
                  </label>
                )}
              </div>
              <div className="mb-2">
                <h1 className="text-2xl sm:text-3xl font-black text-foreground flex items-center justify-center sm:justify-start gap-2">
                  <span>{profileUser.username}</span>
                  {profileUser.isVerified && <span className="bg-blue-600 text-white h-5 w-5 rounded-full text-xs font-bold flex items-center justify-center" title="Verified Creator">✓</span>}
                </h1>
                <p className="text-sm font-semibold text-muted-foreground">{profileUser.email || "Verified Platform Member"}</p>
                <p className="text-xs text-primary font-bold mt-1">482 Friends • {profileUser.karma || 120} Karma</p>
              </div>
            </div>

            {/* Relationship & Profile Actions */}
            <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap pb-2">
              {isSelf ? (
                <Button onClick={() => setIsEditingProfile(!isEditingProfile)} className="rounded-xl bg-primary text-primary-foreground font-bold px-4 shadow-sm">
                  <Edit3 className="mr-2 h-4 w-4" />
                  <span>{isEditingProfile ? "Cancel Editing" : "Edit Profile"}</span>
                </Button>
              ) : (
                <>
                  {/* Friend Request Button */}
                  {rel.friendStatus === "NONE" && (
                    <Button onClick={() => relationshipMutation.mutate({ action: "request" })} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 shadow-sm">
                      <UserPlus className="mr-2 h-4 w-4" /> Add Friend
                    </Button>
                  )}
                  {rel.friendStatus === "PENDING_OUTGOING" && (
                    <Button variant="outline" onClick={() => relationshipMutation.mutate({ action: "unfriend" })} className="rounded-xl font-bold px-4 border-blue-500 text-blue-500">
                      Cancel Request
                    </Button>
                  )}
                  {rel.friendStatus === "PENDING_INCOMING" && (
                    <Button onClick={() => relationshipMutation.mutate({ action: "respond", requestId: rel.requestId, status: "ACCEPTED" })} className="rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold px-4 shadow-sm">
                      <Check className="mr-2 h-4 w-4" /> Accept Request
                    </Button>
                  )}
                  {rel.friendStatus === "ACCEPTED" && (
                    <Button variant="outline" onClick={() => relationshipMutation.mutate({ action: "unfriend" })} className="rounded-xl font-bold px-4 bg-muted/50">
                      <UserCheck className="mr-2 h-4 w-4 text-green-500" /> Friends ✓
                    </Button>
                  )}

                  {/* Follow Button */}
                  <Button
                    variant="outline"
                    onClick={() => relationshipMutation.mutate({ action: "follow" })}
                    className={`rounded-xl font-bold px-4 ${rel.isFollowing ? "bg-purple-500/10 text-purple-600 border-purple-500/30" : ""}`}
                  >
                    <span>{rel.isFollowing ? "Following ✓" : "+ Follow"}</span>
                  </Button>

                  {/* Message Button */}
                  <Button onClick={() => toast("Opening Messenger chat with " + profileUser.username, { icon: "💬" })} className="rounded-xl font-bold px-4 bg-muted text-foreground hover:bg-muted/80">
                    <MessageSquare className="mr-2 h-4 w-4 text-blue-500" /> Message
                  </Button>

                  {/* Three-dots Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full border bg-card">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5 shadow-xl">
                      <DropdownMenuItem onClick={() => relationshipMutation.mutate({ action: "snooze" })} className="rounded-xl font-medium text-amber-600">
                        <span>{rel.isSnoozed ? "Un-snooze User" : "Snooze for 30 Days"}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => relationshipMutation.mutate({ action: "block" })} className="rounded-xl font-medium text-red-600">
                        <ShieldAlert className="mr-2 h-4 w-4" />
                        <span>{rel.isBlocked ? "Unblock User" : "Block User"}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>

          {/* Profile Navigation Tabs */}
          <div className="px-4 sm:px-8 border-t flex items-center gap-1 overflow-x-auto">
            {[
              { id: "TIMELINE", label: "Timeline", icon: Film },
              { id: "ABOUT", label: "About", icon: Briefcase },
              { id: "FRIENDS", label: "Friends (482)", icon: Users },
              { id: "PHOTOS", label: "Photos", icon: Grid },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-all ${
                  activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Profile Body Content */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-6">
        
        {/* Edit Profile Form Modal / Card */}
        {isEditingProfile && (
          <div className="mb-6 bg-card rounded-3xl border p-6 shadow-xl space-y-4 animate-in fade-in-50">
            <h3 className="font-extrabold text-lg text-gradient">Edit Profile Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">Bio / Headline</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell people about yourself..." className="w-full bg-muted rounded-xl p-3 text-sm focus:outline-none border min-h-[80px]" />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Employment / Work</label>
                  <input type="text" value={employment} onChange={e => setEmployment(e.target.value)} placeholder="e.g. Software Engineer at Google" className="w-full bg-muted rounded-xl p-2.5 text-sm focus:outline-none border" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Education / College</label>
                  <input type="text" value={education} onChange={e => setEducation(e.target.value)} placeholder="e.g. Studied at Stanford University" className="w-full bg-muted rounded-xl p-2.5 text-sm focus:outline-none border" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Location / City</label>
                  <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. San Francisco, California" className="w-full bg-muted rounded-xl p-2.5 text-sm focus:outline-none border" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button variant="ghost" onClick={() => setIsEditingProfile(false)} className="rounded-xl font-bold">Cancel</Button>
              <Button onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isLoading} className="rounded-xl bg-primary text-primary-foreground font-bold px-6">
                {updateProfileMutation.isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        )}

        {/* Tab 1: TIMELINE */}
        {activeTab === "TIMELINE" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Intro / About Summary & Featured Photos */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-card rounded-3xl border p-5 shadow-sm space-y-4">
                <h3 className="font-extrabold text-base text-foreground">Intro</h3>
                <p className="text-sm text-foreground/90 leading-relaxed font-normal bg-muted/40 p-3 rounded-2xl border">
                  {profileUser.bio || "No bio added yet. Click Edit Profile to add one!"}
                </p>
                <div className="space-y-2.5 text-xs sm:text-sm font-semibold text-muted-foreground pt-2 border-t">
                  {profileUser.employment && (
                    <div className="flex items-center gap-2.5 text-foreground">
                      <Briefcase className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span>Works at <strong className="font-extrabold">{profileUser.employment}</strong></span>
                    </div>
                  )}
                  {profileUser.education && (
                    <div className="flex items-center gap-2.5 text-foreground">
                      <GraduationCap className="h-4 w-4 text-purple-500 flex-shrink-0" />
                      <span>Studied at <strong className="font-extrabold">{profileUser.education}</strong></span>
                    </div>
                  )}
                  {profileUser.location && (
                    <div className="flex items-center gap-2.5 text-foreground">
                      <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span>Lives in <strong className="font-extrabold">{profileUser.location}</strong></span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5">
                    <Calendar className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <span>Joined {formatDistanceToNow(new Date(profileUser.createdAt || Date.now()), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>

              {/* Featured Photos Grid Card */}
              <div className="bg-card rounded-3xl border p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-base">Featured Photos</h3>
                  <button onClick={() => setActiveTab("PHOTOS")} className="text-xs font-bold text-primary hover:underline">See All</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    "https://images.unsplash.com/photo-1579783902614-a3fb3927b675",
                    "https://images.unsplash.com/photo-1517841905240-472988babdf9",
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
                    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
                    "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
                    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6",
                  ].map((img, idx) => (
                    <div key={idx} className="aspect-square rounded-xl bg-slate-200 overflow-hidden shadow-xs">
                      <img src={img} alt="featured" className="h-full w-full object-cover hover:scale-105 transition-transform cursor-pointer" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: User Posts Feed */}
            <div className="lg:col-span-7 space-y-5">
              {isSelf && (
                <div className="bg-card rounded-3xl border p-4 shadow-sm flex items-center gap-3">
                  <Avatar src={currentUser?.image} alt={currentUser?.username || "Self"} size="md" />
                  <button onClick={() => setShowCreatePost(true)} className="flex-1 h-11 rounded-full bg-muted/70 hover:bg-muted px-4 text-left text-sm font-semibold text-muted-foreground border">
                    Write something on your timeline...
                  </button>
                </div>
              )}

              {postsLoading && <div className="p-8 text-center text-sm text-muted-foreground bg-card rounded-3xl border">Loading user posts...</div>}

              {!postsLoading && userPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}

              {!postsLoading && userPosts.length === 0 && (
                <div className="bg-card rounded-3xl border p-12 text-center space-y-3">
                  <h3 className="font-extrabold text-base">No timeline posts yet</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    When u/{profileUser.username} shares updates, check-ins, or photos, they will appear here on their timeline!
                  </p>
                  {isSelf && <Button onClick={() => setShowCreatePost(true)} className="rounded-xl font-bold text-xs mt-2 bg-primary text-primary-foreground">Create First Timeline Post</Button>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: ABOUT */}
        {activeTab === "ABOUT" && (
          <div className="bg-card rounded-3xl border p-8 shadow-sm space-y-6 max-w-3xl mx-auto">
            <h2 className="text-xl font-black text-gradient border-b pb-4">About u/{profileUser.username}</h2>
            <div className="space-y-4 text-sm font-medium">
              <div>
                <h4 className="font-extrabold text-muted-foreground uppercase text-xs mb-1">Biography</h4>
                <p className="bg-muted/30 p-4 rounded-2xl border text-foreground leading-relaxed">{profileUser.bio || "No biography provided."}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl border bg-muted/20">
                  <span className="text-xs text-muted-foreground block font-bold mb-1">Work / Employment</span>
                  <p className="font-extrabold text-foreground flex items-center gap-2"><Briefcase className="h-4 w-4 text-blue-500" /> {profileUser.employment || "Not specified"}</p>
                </div>
                <div className="p-4 rounded-2xl border bg-muted/20">
                  <span className="text-xs text-muted-foreground block font-bold mb-1">Education</span>
                  <p className="font-extrabold text-foreground flex items-center gap-2"><GraduationCap className="h-4 w-4 text-purple-500" /> {profileUser.education || "Not specified"}</p>
                </div>
                <div className="p-4 rounded-2xl border bg-muted/20">
                  <span className="text-xs text-muted-foreground block font-bold mb-1">Current Location</span>
                  <p className="font-extrabold text-foreground flex items-center gap-2"><MapPin className="h-4 w-4 text-red-500" /> {profileUser.location || "Not specified"}</p>
                </div>
                <div className="p-4 rounded-2xl border bg-muted/20">
                  <span className="text-xs text-muted-foreground block font-bold mb-1">Account Karma</span>
                  <p className="font-extrabold text-foreground flex items-center gap-2"><Heart className="h-4 w-4 text-amber-500" /> {profileUser.karma || 120} reputation points</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: FRIENDS */}
        {activeTab === "FRIENDS" && (
          <div className="bg-card rounded-3xl border p-6 shadow-sm space-y-4">
            <h2 className="text-xl font-black text-gradient border-b pb-3">Friends & Connections (482)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                "Sarah Jenkins", "Alex Rivera", "David Chen", "Emma Watson", "Michael Scott",
                "Pam Beesly", "Jim Halpert", "Dwight Schrute", "Leslie Knope", "Ron Swanson"
              ].map((f, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-2xl border bg-muted/20 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${f}`} alt={f} size="md" />
                    <div className="min-w-0">
                      <p className="font-extrabold text-sm truncate text-foreground">{f}</p>
                      <p className="text-[10px] text-muted-foreground">12 mutual friends</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold px-2.5">Friends ✓</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: PHOTOS */}
        {activeTab === "PHOTOS" && (
          <div className="bg-card rounded-3xl border p-6 shadow-sm space-y-4">
            <h2 className="text-xl font-black text-gradient border-b pb-3">Photos & Media Collage</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                "https://images.unsplash.com/photo-1579783902614-a3fb3927b675",
                "https://images.unsplash.com/photo-1517841905240-472988babdf9",
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
                "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6",
                "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",
                "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df",
              ].map((img, idx) => (
                <div key={idx} className="aspect-square rounded-2xl bg-slate-200 overflow-hidden shadow-xs">
                  <img src={img} alt="photo" className="h-full w-full object-cover hover:scale-105 transition-transform cursor-pointer" />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {showCreatePost && (
        <CreatePostDialog onClose={() => setShowCreatePost(false)} />
      )}
    </div>
  );
}
