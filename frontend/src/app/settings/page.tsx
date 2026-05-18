"use client";

import { useAuth } from "@/contexts/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <section className="cinematic-card p-6">
          <h1 className="text-2xl font-bold text-gradient">Settings</h1>
          <p className="text-muted-foreground mt-3">
            {user
              ? `Signed in as ${user.username}.`
              : "Sign in to manage your profile settings."}
          </p>
        </section>
      </div>
    </main>
  );
}
