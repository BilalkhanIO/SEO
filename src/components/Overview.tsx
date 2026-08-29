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
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-stone-800 to-stone-850 border border-stone-700/80 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Playbook 2026 Engine
              </span>
              {currentBlog && (
                <span className="text-xs text-stone-400 font-mono">
                  Target: <span className="text-stone-200 font-semibold">{currentBlog.name}</span> ({currentBlog.url})
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-100 tracking-tight">
              Blogger SEO Command Center
            </h1>
            <p className="mt-2 text-stone-400 text-sm sm:text-base max-w-2xl leading-relaxed">
              Automated multi-blog SEO loop for Google Blogger: keyword harvesting, SERP gap briefs, 
              pre-publish on-page validation gates, rank tracking recipes, Core Web Vitals, and outreach CRM.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate("keywords")}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm shadow-md transition-all flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Harvest Keywords
            </button>
            <button
              onClick={() => onNavigate("validator")}
              className="px-4 py-2.5 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-100 font-semibold text-sm border border-stone-600 shadow-sm transition-all flex items-center gap-2"
            >
              <FileCheck className="w-4 h-4" />
              Validate Draft
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => onNavigate("keywords")}
          className="bg-stone-850/80 hover:bg-stone-800 border border-stone-700/60 p-5 rounded-2xl cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-stone-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Keywords</span>
            <Search className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-extrabold text-stone-100 font-mono">
            {systemStatus.counts.keywords}
          </div>
          <div className="text-xs text-stone-400 mt-2 flex items-center gap-1">
            <span>Harvested & scored candidates</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div 
          onClick={() => onNavigate("pipeline")}
          className="bg-stone-850/80 hover:bg-stone-800 border border-stone-700/60 p-5 rounded-2xl cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-stone-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Pipeline</span>
            <Sparkles className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-extrabold text-stone-100 font-mono">
            {recentPosts.length}
          </div>
          <div className="text-xs text-stone-400 mt-2 flex items-center gap-1">
            <span>Active post stages</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div 
          onClick={() => onNavigate("tracking")}
          className="bg-stone-850/80 hover:bg-stone-800 border border-stone-700/60 p-5 rounded-2xl cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-stone-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">SEO Action Alerts</span>
            <TrendingUp className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-extrabold text-stone-100 font-mono">
            {alerts.length}
          </div>
          <div className="text-xs text-stone-400 mt-2 flex items-center gap-1">
            <span>Striking distance & CTR fixes</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div 
          onClick={() => onNavigate("outreach")}
          className="bg-stone-850/80 hover:bg-stone-800 border border-stone-700/60 p-5 rounded-2xl cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-stone-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Outreach CRM</span>
            <Send className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-extrabold text-stone-100 font-mono">
            {systemStatus.counts.prospects}
          </div>
          <div className="text-xs text-stone-400 mt-2 flex items-center gap-1">
            <span>{dueProspects.length} follow-ups due today</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>

      {/* Main Grid: Priority Action Stream & Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Action Alerts & Follow-ups */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active GSC Recipe Alerts */}
          <div className="bg-stone-850/60 border border-stone-700/60 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-stone-100">GSC Money Recipe Alerts</h2>
              </div>
              <button 
                onClick={() => onNavigate("tracking")}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
              >
                Run Recipes <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-stone-400 text-sm">Loading alerts...</div>
            ) : alerts.length === 0 ? (
              <div className="py-8 text-center bg-stone-900/50 rounded-xl border border-dashed border-stone-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="text-stone-300 font-medium text-sm">No open SEO action alerts!</p>
                <p className="text-stone-400 text-xs mt-1">
                  Sync Search Console snapshots in the Rank Tracking tab to trigger automated recipe audits.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 rounded-xl bg-stone-900/90 border border-stone-800 hover:border-stone-700 transition-colors flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          alert.type === "striking_distance" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                          alert.type === "ctr_fix" ? "bg-sky-500/20 text-sky-300 border border-sky-500/30" :
                          alert.type === "decay" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                          "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        }`}>
                          {alert.type.replace("_", " ")}
                        </span>
                        <span className="text-xs text-stone-400 font-mono truncate max-w-xs">{alert.post_url}</span>
                      </div>
                      <p className="text-sm text-stone-200">{alert.message}</p>
                    </div>
                    <button
                      onClick={() => markAlertDone(alert.id)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-stone-800 hover:bg-emerald-500/20 text-stone-300 hover:text-emerald-300 border border-stone-700 hover:border-emerald-500/40 transition-all shrink-0"
                    >
                      Done
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outreach Follow-ups Due Today */}
          <div className="bg-stone-850/60 border border-stone-700/60 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold text-stone-100">Outreach Actions Due Today</h2>
              </div>
              <button 
                onClick={() => onNavigate("outreach")}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
              >
                View Pipeline <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {dueProspects.length === 0 ? (
              <div className="py-6 text-center bg-stone-900/50 rounded-xl border border-dashed border-stone-800 text-stone-400 text-xs">
                🎉 No outreach actions or follow-ups pending today.
              </div>
            ) : (
              <div className="space-y-2">
                {dueProspects.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-stone-200">{p.site_name || p.site_url}</span>
                        <span className="text-xs text-stone-400 font-mono">[{p.opportunity}]</span>
                      </div>
                      <div className="text-xs text-stone-400 mt-0.5">
                        Status: <span className="text-indigo-300 font-medium">{p.status}</span> · Contact: {p.contact_email || "No email"}
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate("outreach")}
                      className="px-3 py-1 text-xs rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 font-medium"
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
          <div className="bg-stone-850/60 border border-stone-700/60 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-stone-100">Top Validated Keywords</h2>
              </div>
              <button 
                onClick={() => onNavigate("keywords")}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
              >
                All
              </button>
            </div>

            {topKeywords.length === 0 ? (
              <div className="py-6 text-center bg-stone-900/50 rounded-xl border border-dashed border-stone-800 text-stone-400 text-xs">
                No scored keywords yet. Harvest seeds and run the 5-gate scoring funnel.
              </div>
            ) : (
              <div className="space-y-2.5">
                {topKeywords.slice(0, 5).map((k) => (
                  <div
                    key={k.id}
                    className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center justify-between"
                  >
                    <div className="truncate pr-2">
                      <div className="text-sm font-medium text-stone-200 truncate">{k.keyword}</div>
                      <div className="text-[11px] text-stone-400">
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
          <div className="bg-gradient-to-br from-stone-850 to-stone-900 border border-stone-700/60 rounded-2xl p-6 space-y-3">
            <h3 className="text-sm font-bold text-stone-200 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              Standard SEO Workflow Loop
            </h3>
            <ol className="text-xs text-stone-300 space-y-2 list-decimal list-inside leading-relaxed">
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
