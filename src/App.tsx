import React, { useState, useEffect } from "react";
import { Blog } from "./types.js";
import { Overview } from "./components/Overview.js";
import { KeywordResearch } from "./components/KeywordResearch.js";
import { SerpBriefs } from "./components/SerpBriefs.js";
import { ContentPipeline } from "./components/ContentPipeline.js";
import { PrePublishValidator } from "./components/PrePublishValidator.js";
import { SchemaGenerator } from "./components/SchemaGenerator.js";
import { RankTracker } from "./components/RankTracker.js";
import { SiteHealth } from "./components/SiteHealth.js";
import { OutreachCrm } from "./components/OutreachCrm.js";
import { BlogManager } from "./components/BlogManager.js";
import { TechnicalTools } from "./components/TechnicalTools.js";
import {
  Sparkles,
  LayoutDashboard,
  Search,
  FileText,
  Layers,
  FileCheck,
  Code,
  TrendingUp,
  Activity,
  Send,
  Globe,
  ChevronDown,
  ShieldCheck,
  AlertCircle,
  Wrench,
} from "lucide-react";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [currentBlog, setCurrentBlog] = useState<Blog | null>(null);
  const [systemStatus, setSystemStatus] = useState<{
    authReady: boolean;
    hasSerper: boolean;
    hasPageSpeed: boolean;
    hasGemini: boolean;
    counts: { blogs: number; keywords: number; prospects: number; alerts: number };
  }>({
    authReady: false,
    hasSerper: false,
    hasPageSpeed: false,
    hasGemini: true,
    counts: { blogs: 0, keywords: 0, prospects: 0, alerts: 0 },
  });

  // State passing between components
  const [serpKeyword, setSerpKeyword] = useState<string>("");
  const [serpKeywordId, setSerpKeywordId] = useState<number | undefined>(undefined);
  const [pendingPostData, setPendingPostData] = useState<{
    title: string;
    briefMd: string;
    keywordId?: number;
  } | null>(null);
  const [validatorTitle, setValidatorTitle] = useState<string>("");
  const [validatorKeyword, setValidatorKeyword] = useState<string>("");

  useEffect(() => {
    fetchSystemStatus();
    fetchBlogs();
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch("/api/system/status");
      if (res.ok) {
        setSystemStatus(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch system status:", err);
    }
  };

  const fetchBlogs = async () => {
    try {
      const res = await fetch("/api/blogs");
      if (res.ok) {
        const data: Blog[] = await res.json();
        setBlogs(data);
        if (data.length > 0 && !currentBlog) {
          setCurrentBlog(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch blogs:", err);
    }
  };

  const handleOpenSerp = (kw: string, kwId?: number) => {
    setSerpKeyword(kw);
    setSerpKeywordId(kwId);
    setActiveTab("serp");
  };

  const handleSendToPipeline = (title: string, briefMd: string, keywordId?: number) => {
    setPendingPostData({ title, briefMd, keywordId });
    setActiveTab("pipeline");
  };

  const handleValidatePost = (title: string, keyword?: string) => {
    setValidatorTitle(title);
    setValidatorKeyword(keyword || "");
    setActiveTab("validator");
  };

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "keywords", label: "Keywords", icon: Search },
    { id: "serp", label: "SERP & Briefs", icon: FileText },
    { id: "pipeline", label: "Pipeline", icon: Layers },
    { id: "validator", label: "Validator", icon: FileCheck },
    { id: "schema", label: "Schema", icon: Code },
    { id: "tracking", label: "Rank Tracking", icon: TrendingUp },
    { id: "health", label: "Site Health", icon: Activity },
    { id: "outreach", label: "Outreach CRM", icon: Send },
    { id: "tools", label: "Tech SEO Tools", icon: Wrench },
    { id: "blogs", label: "Blogs", icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-stone-900/90 backdrop-blur-md border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("overview")}>
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-stone-950 shadow-md">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight flex items-center gap-2">
                <span>Blogger SEO Command</span>
                <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Pro
                </span>
              </div>
              <p className="text-[11px] text-stone-400 font-mono -mt-0.5">Multi-Blog Organic Engine</p>
            </div>
          </div>

          {/* Active Blog Switcher & System Indicators */}
          <div className="flex items-center gap-3">
            {blogs.length > 0 && (
              <div className="relative">
                <select
                  value={currentBlog?.id || ""}
                  onChange={(e) => {
                    const found = blogs.find((b) => b.id === parseInt(e.target.value));
                    if (found) setCurrentBlog(found);
                  }}
                  className="appearance-none bg-stone-850 hover:bg-stone-800 border border-stone-700/80 text-stone-200 text-xs font-semibold pl-3 pr-8 py-2 rounded-xl focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
                >
                  {blogs.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.url.replace(/^https?:\/\//, "").replace(/\/$/, "")})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            )}

            {/* API Status Pills */}
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono">
              <span
                title={systemStatus.hasGemini ? "Gemini 3.7 Flash AI Engine Active" : "Gemini AI Key Pending"}
                className={`px-2 py-1 rounded-lg border flex items-center gap-1 ${
                  systemStatus.hasGemini
                    ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                    : "bg-stone-800 text-stone-400 border-stone-700"
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                Gemini AI
              </span>

              <span
                title={systemStatus.authReady ? "Google OAuth Configured" : "Google OAuth Configured (Client ID Loaded)"}
                className={`px-2 py-1 rounded-lg border flex items-center gap-1 ${
                  systemStatus.authReady
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                    : "bg-stone-800 text-stone-400 border-stone-700"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${systemStatus.authReady ? "bg-emerald-400" : "bg-stone-500"}`} />
                Google API
              </span>

              <span
                title={systemStatus.hasSerper ? "Serper Live SERP Connected" : "SERP Scraper Ready"}
                className={`px-2 py-1 rounded-lg border flex items-center gap-1 ${
                  systemStatus.hasSerper
                    ? "bg-sky-500/10 text-sky-300 border-sky-500/20"
                    : "bg-stone-800 text-stone-400 border-stone-700"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${systemStatus.hasSerper ? "bg-sky-400" : "bg-stone-500"}`} />
                SERP
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="border-t border-stone-800/80 bg-stone-900/60 overflow-x-auto no-scrollbar">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 py-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                    isActive
                      ? "bg-amber-500 text-stone-950 shadow-sm font-bold"
                      : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/60"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-stone-950" : "text-stone-400"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === "overview" && (
          <Overview
            currentBlog={currentBlog}
            onNavigate={(tab) => setActiveTab(tab)}
            systemStatus={systemStatus}
          />
        )}

        {activeTab === "keywords" && (
          <KeywordResearch
            currentBlog={currentBlog}
            onOpenSerp={handleOpenSerp}
            onCreateBrief={(kwId) => {
              const kw = systemStatus; // or pass callback
              setActiveTab("serp");
            }}
          />
        )}

        {activeTab === "serp" && (
          <SerpBriefs
            initialKeyword={serpKeyword}
            initialKeywordId={serpKeywordId}
            currentBlog={currentBlog}
            onSendToPipeline={handleSendToPipeline}
          />
        )}

        {activeTab === "pipeline" && (
          <ContentPipeline
            currentBlog={currentBlog}
            onValidatePost={handleValidatePost}
            pendingPostData={pendingPostData}
          />
        )}

        {activeTab === "validator" && (
          <PrePublishValidator
            currentBlog={currentBlog}
            initialTitle={validatorTitle}
            initialKeyword={validatorKeyword}
          />
        )}

        {activeTab === "schema" && <SchemaGenerator />}

        {activeTab === "tracking" && <RankTracker currentBlog={currentBlog} />}

        {activeTab === "health" && <SiteHealth currentBlog={currentBlog} />}

        {activeTab === "outreach" && <OutreachCrm currentBlog={currentBlog} />}

        {activeTab === "tools" && <TechnicalTools />}

        {activeTab === "blogs" && (
          <BlogManager
            blogs={blogs}
            currentBlog={currentBlog}
            onSelectBlog={(b) => setCurrentBlog(b)}
            onRefreshBlogs={fetchBlogs}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-850 bg-stone-900/40 py-6 text-center text-xs text-stone-500 font-mono">
        Blogger SEO Command Center · Google Search Console & Blogger Playbook 2026 Engine
      </footer>
    </div>
  );
};
