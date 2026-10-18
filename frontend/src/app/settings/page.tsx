"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";

export default function SettingsPage() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const security = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!token) return router.push("/login");
    setBusy(true);
    try {
      await axios.post("/api/auth/security", { action, ...extra }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(action === "change_password" ? "Password changed. All sessions were signed out." : "Done");
      logout();
      router.push("/");
    } catch (error: any) { toast.error(error.response?.data?.error || "Could not complete this action"); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <section className="cinematic-card p-6"><h1 className="text-2xl font-bold text-gradient">Account & Privacy</h1><p className="text-muted-foreground mt-3">{user ? `Signed in as ${user.username}.` : "Sign in to manage your account."}</p></section>
        {user && <>
          <section className="cinematic-card space-y-4 p-6"><h2 className="text-lg font-bold">Change password</h2><input className="cinematic-input" type="password" placeholder="Current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /><input className="cinematic-input" type="password" placeholder="New password (8+ characters)" value={newPassword} onChange={e => setNewPassword(e.target.value)} /><Button disabled={busy || !currentPassword || newPassword.length < 8} onClick={() => security("change_password", { currentPassword, newPassword })}>Change password</Button></section>
          <section className="cinematic-card space-y-3 p-6"><h2 className="text-lg font-bold">Sessions & account</h2><Button variant="outline" disabled={busy} onClick={() => security("logout_everywhere")}>Log out everywhere</Button><Button variant="outline" disabled={busy} className="border-red-500 text-red-600" onClick={() => { if (window.confirm("Permanently delete your account and all content?")) security("delete_account", { permanent: true }); }}>Delete account permanently</Button><Button variant="outline" disabled={busy} className="border-amber-500 text-amber-600" onClick={() => { if (window.confirm("Temporarily deactivate your account?")) security("delete_account", { permanent: false }); }}>Temporarily deactivate account</Button></section>
        </>}
      </div>
    </main>
  );
}
