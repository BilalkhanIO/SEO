import React, { useState, useEffect } from "react";
import { Blog, Alert, Prospect, Post, Keyword } from "../types.js";
import {
  Sparkles,
  TrendingUp,
  Search,
  FileCheck,
  Activity,
  Send,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Clock,
  Zap,
} from "lucide-react";

interface OverviewProps {
  currentBlog: Blog | null;
  onNavigate: (tab: string) => void;
  systemStatus: {
    authReady: boolean;
    hasSerper: boolean;
    hasPageSpeed: boolean;
    counts: { blogs: number; keywords: number; prospects: number; alerts: number };
  };
}

export const Overview: React.FC<OverviewProps> = ({ currentBlog, onNavigate, systemStatus }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dueProspects, setDueProspects] = useState<Prospect[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [topKeywords, setTopKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [currentBlog]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const blogQuery = currentBlog ? `blogId=${currentBlog.id}` : "";
      const queryPrefix = blogQuery ? `?${blogQuery}&` : "?";
      
      const [alertsRes, dueRes, postsRes, kwRes] = await Promise.all([
        fetch(`/api/alerts${queryPrefix}status=open`),
        fetch(`/api/outreach/due${currentBlog ? `?${blogQuery}` : ""}`),
        fetch(`/api/posts${currentBlog ? `?${blogQuery}` : ""}`),
        fetch(`/api/keywords${queryPrefix}status=scored`),
      ]);

      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (dueRes.ok) setDueProspects(await dueRes.json());
      if (postsRes.ok) setRecentPosts(await postsRes.json());
      if (kwRes.ok) setTopKeywords(await kwRes.json());
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAlertDone = async (id: number) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error("Failed to dismiss alert:", err);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/8 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Playbook 2026 Engine
              </span>
              {currentBlog && (
                <span className="text-xs text-stone-400 font-mono bg-stone-950/60 px-2.5 py-0.5 rounded-full border border-stone-800">
                  Target: <span className="text-stone-200 font-semibold">{currentBlog.name}</span>
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-stone-100 tracking-tight">
              Blogger SEO Command Center
            </h1>
            <p className="text-stone-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Automated multi-blog SEO loop for Google Blogger: keyword harvesting, SERP gap briefs, 
              pre-publish on-page validation gates, rank tracking recipes, Core Web Vitals, and AdSense readiness.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate("autoblog")}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Zap className="w-4 h-4 fill-current" />
              360° Auto-Pilot
            </button>
            <button
              onClick={() => onNavigate("google")}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 font-semibold text-xs sm:text-sm border border-stone-700 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              AdSense & Suite
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => onNavigate("keywords")}
          className="bg-stone-900/90 hover:bg-stone-850 border border-stone-800 hover:border-amber-500/40 p-4 sm:p-5 rounded-2xl cursor-pointer transition-all group shadow-sm"
        >
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Keywords</span>
            <Search className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-stone-100 font-mono">
            {systemStatus.counts.keywords}
          </div>
          <div className="text-[11px] text-stone-400 mt-2 flex items-center gap-1">
            <span className="truncate">Harvested & scored</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto text-amber-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div 
          onClick={() => onNavigate("pipeline")}
          className="bg-stone-900/90 hover:bg-stone-850 border border-stone-800 hover:border-sky-500/40 p-4 sm:p-5 rounded-2xl cursor-pointer transition-all group shadow-sm"
        >
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Pipeline</span>
            <Sparkles className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-stone-100 font-mono">
            {recentPosts.length}
          </div>
          <div className="text-[11px] text-stone-400 mt-2 flex items-center gap-1">
            <span className="truncate">Active post stages</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto text-sky-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div 
          onClick={() => onNavigate("tracking")}
          className="bg-stone-900/90 hover:bg-stone-850 border border-stone-800 hover:border-emerald-500/40 p-4 sm:p-5 rounded-2xl cursor-pointer transition-all group shadow-sm"
        >
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Action Alerts</span>
            <TrendingUp className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-stone-100 font-mono">
            {alerts.length}
          </div>
          <div className="text-[11px] text-stone-400 mt-2 flex items-center gap-1">
            <span className="truncate">Striking distance fixes</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto text-emerald-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div 
          onClick={() => onNavigate("outreach")}
          className="bg-stone-900/90 hover:bg-stone-850 border border-stone-800 hover:border-indigo-500/40 p-4 sm:p-5 rounded-2xl cursor-pointer transition-all group shadow-sm"
        >
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Outreach CRM</span>
            <Send className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-stone-100 font-mono">
            {systemStatus.counts.prospects}
          </div>
          <div className="text-[11px] text-stone-400 mt-2 flex items-center gap-1">
            <span className="truncate">{dueProspects.length} follow-ups due</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto text-indigo-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>

      {/* Main Grid: Priority Action Stream & Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left 2 Cols: Action Alerts & Follow-ups */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active GSC Recipe Alerts */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <h2 className="text-base sm:text-lg font-bold text-stone-100">GSC Money Recipe Alerts</h2>
              </div>
              <button 
                onClick={() => onNavigate("tracking")}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                Run Recipes <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-stone-400 text-xs sm:text-sm">Loading alerts...</div>
            ) : alerts.length === 0 ? (
              <div className="py-8 px-4 text-center bg-stone-950/60 rounded-2xl border border-dashed border-stone-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="text-stone-300 font-medium text-xs sm:text-sm">No open SEO action alerts!</p>
                <p className="text-stone-400 text-[11px] sm:text-xs mt-1 max-w-md mx-auto">
                  Sync Search Console snapshots in the Rank Tracking tab to trigger automated recipe audits.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 sm:space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-stone-950/70 border border-stone-850 hover:border-stone-750 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          alert.type === "striking_distance" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                          alert.type === "ctr_fix" ? "bg-sky-500/20 text-sky-300 border border-sky-500/30" :
                          alert.type === "decay" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                          "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        }`}>
                          {alert.type.replace("_", " ")}
                        </span>
                        <span className="text-[11px] text-stone-400 font-mono truncate max-w-full sm:max-w-xs">{alert.post_url}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-stone-200">{alert.message}</p>
                    </div>
                    <button
                      onClick={() => markAlertDone(alert.id)}
                      className="self-end sm:self-center px-3 py-1.5 text-xs font-semibold rounded-xl bg-stone-850 hover:bg-emerald-500/20 text-stone-300 hover:text-emerald-300 border border-stone-750 hover:border-emerald-500/40 transition-all shrink-0 cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outreach Follow-ups Due Today */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base sm:text-lg font-bold text-stone-100">Outreach Actions Due Today</h2>
              </div>
              <button 
                onClick={() => onNavigate("outreach")}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                View Pipeline <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {dueProspects.length === 0 ? (
              <div className="py-6 px-4 text-center bg-stone-950/60 rounded-2xl border border-dashed border-stone-800 text-stone-400 text-xs">
                🎉 No outreach actions or follow-ups pending today.
              </div>
            ) : (
              <div className="space-y-2">
                {dueProspects.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="p-3 sm:p-3.5 rounded-2xl bg-stone-950/70 border border-stone-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-semibold text-stone-200">{p.site_name || p.site_url}</span>
                        <span className="text-[10px] text-stone-400 font-mono">[{p.opportunity}]</span>
                      </div>
                      <div className="text-[11px] text-stone-400 mt-0.5">
                        Status: <span className="text-indigo-300 font-medium">{p.status}</span> · Contact: {p.contact_email || "No email"}
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate("outreach")}
                      className="self-end sm:self-center px-3 py-1.5 text-xs rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 font-medium cursor-pointer"
                    >
                      Update
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Top Keyword Opportunities & Pipeline Quick Look */}
        <div className="space-y-6">
          {/* Top Scored Keywords (>=8 / 10) */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h2 className="text-base sm:text-lg font-bold text-stone-100">Top Validated Keywords</h2>
              </div>
              <button 
                onClick={() => onNavigate("keywords")}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
              >
                All
              </button>
            </div>

            {topKeywords.length === 0 ? (
              <div className="py-6 px-4 text-center bg-stone-950/60 rounded-2xl border border-dashed border-stone-800 text-stone-400 text-xs">
                No scored keywords yet. Harvest seeds and run the 5-gate scoring funnel.
              </div>
            ) : (
              <div className="space-y-2">
                {topKeywords.slice(0, 5).map((k) => (
                  <div
                    key={k.id}
                    className="p-3 rounded-2xl bg-stone-950/70 border border-stone-850 flex items-center justify-between gap-2"
                  >
                    <div className="truncate pr-1">
                      <div className="text-xs sm:text-sm font-medium text-stone-200 truncate">{k.keyword}</div>
                      <div className="text-[10px] sm:text-[11px] text-stone-400">
                        Source: {k.source} · Intent: {k.intent || "Not specified"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {k.score_total ?? 0}/10
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Playbook Workflow Guide */}
          <div className="bg-gradient-to-br from-stone-900 to-stone-850 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-3 shadow-sm">
            <h3 className="text-xs sm:text-sm font-bold text-stone-200 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              Standard SEO Workflow Loop
            </h3>
            <ol className="text-[11px] sm:text-xs text-stone-300 space-y-2 list-decimal list-inside leading-relaxed">
              <li><strong className="text-stone-100">Harvest:</strong> Expand seeds via Google Autocomplete & GSC gaps.</li>
              <li><strong className="text-stone-100">Score:</strong> Apply the 5-Gate funnel (write only if score ≥ 8/10).</li>
              <li><strong className="text-stone-100">SERP Brief:</strong> Fetch competitor headings & PAA questions.</li>
              <li><strong className="text-stone-100">Validate:</strong> Run on-page gate (Title, Permalink, Alt text, Links).</li>
              <li><strong className="text-stone-100">Track & Refresh:</strong> Check 28-day GSC snapshots for decay and CTR fixers.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
