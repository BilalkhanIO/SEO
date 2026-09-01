import React, { useState, useEffect } from "react";
import { Blog, Alert } from "../types.js";
import {
  TrendingUp,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

interface RankTrackerProps {
  currentBlog: Blog | null;
}

export const RankTracker: React.FC<RankTrackerProps> = ({ currentBlog }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [recipeStats, setRecipeStats] = useState<any>(null);

  useEffect(() => {
    fetchAlerts();
  }, [currentBlog]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const blogParam = currentBlog ? `?blogId=${currentBlog.id}` : "";
      const res = await fetch(`/api/alerts${blogParam}`);
      if (res.ok) {
        setAlerts(await res.json());
      }
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncGsc = async () => {
    if (!currentBlog) {
      alert("Please select a registered blog first.");
      return;
    }
    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const res = await fetch("/api/tracking/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogId: currentBlog.id, days: 28 }),
      });

      const data = await res.json();
      if (res.ok) {
        setSyncMessage(`Synced ${data.count} query & page rows from Google Search Console!`);
        fetchAlerts();
      } else {
        alert(data.error || "GSC Sync failed. Ensure OAuth is configured.");
      }
    } catch (err: any) {
      alert("Sync error: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRunAudit = async (recipeName?: string) => {
    if (!currentBlog) {
      alert("Please select a registered blog first.");
      return;
    }
    setIsAuditing(true);
    try {
      const res = await fetch("/api/tracking/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogId: currentBlog.id, recipe: recipeName }),
      });

      const data = await res.json();
      if (res.ok) {
        setRecipeStats(data);
        fetchAlerts();
      } else {
        alert(data.error || "Audit failed");
      }
    } catch (err: any) {
      alert("Audit error: " + err.message);
    } finally {
      setIsAuditing(false);
    }
  };

  const markAlert = async (id: number, status: "done" | "dismissed") => {
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status } : a))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openAlerts = alerts.filter((a) => a.status === "open");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            Rank Tracker & 6 GSC Money Recipes
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Automated Google Search Console audits · Striking distance (Pos 4-15) · CTR fixers · Content decay detection
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncGsc}
            disabled={isSyncing || !currentBlog}
            className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 font-semibold text-xs border border-stone-700 flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing GSC..." : "Sync 28d Snapshot"}
          </button>

          <button
            onClick={() => handleRunAudit()}
            disabled={isAuditing || !currentBlog}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold text-xs shadow flex items-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isAuditing ? "Auditing Recipes..." : "Run All 6 Recipes"}
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {syncMessage}
        </div>
      )}

      {/* 6 Recipes Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Recipe #1</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Quick Wins
            </span>
          </div>
          <h3 className="text-sm font-bold text-stone-100">Striking Distance Queries</h3>
          <p className="text-xs text-stone-400">
            Queries ranking between positions 4 and 15 with &gt;50 impressions. Adding an H2 or dedicated paragraph often pushes them to Top 3.
          </p>
        </div>

        <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Recipe #2</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
              CTR Optimization
            </span>
          </div>
          <h3 className="text-sm font-bold text-stone-100">CTR Fixers</h3>
          <p className="text-xs text-stone-400">
            Top 10 queries with CTR &lt; 2%. Rewrite title tags and meta search descriptions to improve click-through rates.
          </p>
        </div>

        <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Recipe #4</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Decay Prevention
            </span>
          </div>
          <h3 className="text-sm font-bold text-stone-100">Content Decay Detection</h3>
          <p className="text-xs text-stone-400">
            Posts with declining clicks over consecutive 28-day windows. Signals an immediate need for an update/refresh.
          </p>
        </div>
      </div>

      {/* Action Alerts List */}
      <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Active Action Alerts ({openAlerts.length})
          </h3>
        </div>

        {loading ? (
          <div className="py-12 text-center text-stone-400 text-sm">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="py-12 text-center bg-stone-900/50 rounded-xl border border-dashed border-stone-800 text-stone-400 text-xs">
            No open alerts. Click "Run All 6 Recipes" after syncing Search Console data to uncover optimization opportunities.
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  alert.status === "open"
                    ? "bg-stone-900/90 border-stone-700"
                    : "bg-stone-900/40 border-stone-800/60 opacity-60"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        alert.type === "striking_distance"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : alert.type === "ctr_fix"
                          ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                          : alert.type === "decay"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      }`}
                    >
                      {alert.type.replace("_", " ")}
                    </span>
                    <span className="text-xs font-mono text-stone-400 truncate max-w-md">
                      {alert.post_url}
                    </span>
                  </div>
                  <p className="text-xs text-stone-200">{alert.message}</p>
                </div>

                {alert.status === "open" ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => markAlert(alert.id, "done")}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-semibold text-xs"
                    >
                      Mark Resolved
                    </button>
                    <button
                      onClick={() => markAlert(alert.id, "dismissed")}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 text-xs"
                    >
                      Dismiss
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-emerald-400 font-mono">[{alert.status}]</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
