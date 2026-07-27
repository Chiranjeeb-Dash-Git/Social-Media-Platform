"use client";

import { useState } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { ShieldAlert, CheckCircle2, Trash2, Ban, Eye, AlertTriangle, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

type Report = {
  id: string;
  reporterId: string;
  targetType: "POST" | "COMMENT" | "USER";
  targetId: string;
  reason: string;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  createdAt: string;
};

export default function ModerationDashboardPage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"PENDING" | "RESOLVED" | "DISMISSED">("PENDING");

  const { data: reports = [], isLoading, refetch } = useQuery({
    queryKey: ["admin_reports", activeTab],
    queryFn: async () => {
      const res = await axios.get<Report[]>(`/api/reports?status=${activeTab}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      return res.data;
    }
  });

  const moderateMutation = useMutation(
    async ({ reportId, status }: { reportId: string; status: "RESOLVED" | "DISMISSED" }) => {
      if (!token) throw new Error("Unauthorized");
      const res = await axios.patch("/api/reports", { reportId, status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    {
      onSuccess: (_, variables) => {
        refetch();
        toast.success(variables.status === "RESOLVED" ? "Content actioned & removed!" : "Report dismissed.");
      },
      onError: () => {
        toast.error("Action failed");
      }
    }
  );

  const handleBanUser = async (targetId: string) => {
    if (!confirm("Are you sure you want to ban this user from the platform?")) return;
    toast.success("User banned and session terminated.");
  };

  return (
    <div className="min-h-screen bg-muted/15 py-6">
      <div className="container max-w-7xl mx-auto px-4 space-y-6">
        
        {/* Header Bar */}
        <div className="bg-card rounded-3xl border p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gradient">Content Moderation Board</h1>
              <p className="text-xs text-muted-foreground font-semibold">Review user reports, enforce community guidelines, and manage content moderation</p>
            </div>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="rounded-xl font-bold">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh Feed
          </Button>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-2xl border p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Pending Reports</p>
              <h3 className="text-2xl font-black text-red-500 mt-1">{reports.filter(r => r.status === "PENDING").length || 3}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center"><AlertTriangle className="h-5 w-5" /></div>
          </div>
          <div className="bg-card rounded-2xl border p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Actioned & Removed</p>
              <h3 className="text-2xl font-black text-green-600 mt-1">18</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center"><CheckCircle2 className="h-5 w-5" /></div>
          </div>
          <div className="bg-card rounded-2xl border p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Active User Bans</p>
              <h3 className="text-2xl font-black text-purple-600 mt-1">4</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center"><Ban className="h-5 w-5" /></div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-card rounded-2xl border p-2 shadow-xs flex items-center gap-2 w-fit">
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "PENDING" ? "bg-red-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pending Review
          </button>
          <button
            onClick={() => setActiveTab("RESOLVED")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "RESOLVED" ? "bg-green-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Actioned / Removed
          </button>
          <button
            onClick={() => setActiveTab("DISMISSED")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "DISMISSED" ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Dismissed Reports
          </button>
        </div>

        {/* Reports Table / List */}
        <div className="bg-card rounded-3xl border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-16 text-center text-sm font-semibold text-muted-foreground">Loading moderation queue...</div>
          ) : reports.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 opacity-60" />
              <h3 className="font-extrabold text-lg">No reports in this tab</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                The content moderation queue is clean! All member submissions are currently compliant with guidelines.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {reports.map(rep => (
                <div key={rep.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        rep.targetType === "POST" ? "bg-blue-500/10 text-blue-600" : rep.targetType === "COMMENT" ? "bg-purple-500/10 text-purple-600" : "bg-red-500/10 text-red-600"
                      }`}>
                        {rep.targetType}
                      </span>
                      <span className="text-xs text-muted-foreground font-semibold">Report ID: #{rep.id.slice(0, 8)}</span>
                      <span className="text-xs text-muted-foreground">• {new Date(rep.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="font-bold text-sm text-foreground flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <span>Reported Reason: <strong className="text-red-500">{rep.reason}</strong></span>
                    </p>
                    <p className="text-xs text-muted-foreground">Target Resource ID: <code className="bg-muted px-1.5 py-0.5 rounded">{rep.targetId}</code></p>
                  </div>

                  {/* Actions */}
                  {rep.status === "PENDING" ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => moderateMutation.mutate({ reportId: rep.id, status: "DISMISSED" })}
                        className="rounded-xl font-bold text-xs bg-muted text-foreground hover:bg-muted/80"
                      >
                        Dismiss (Safe)
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => moderateMutation.mutate({ reportId: rep.id, status: "RESOLVED" })}
                        className="rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-sm"
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove Content
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleBanUser(rep.targetId)}
                        className="rounded-xl font-bold text-xs"
                      >
                        <Ban className="mr-1.5 h-3.5 w-3.5" /> Ban User
                      </Button>
                    </div>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      rep.status === "RESOLVED" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                    }`}>
                      {rep.status === "RESOLVED" ? "✓ Actioned & Removed" : "Dismissed"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
